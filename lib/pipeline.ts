import { getTickers, getCandles, type BitgetTicker } from "@/lib/bitget";
import { recordOi, deltaOiPct, oiSampleCount } from "@/lib/oiBuffer";
import { ema, rsi, pctChange } from "@/lib/indicators";
import {
  computeFactors,
  combine,
  DEFAULT_WEIGHTS,
  type RawRow,
  type FactoredRow,
} from "@/lib/scoring";

export interface Universe {
  generatedAt: string;
  universeSize: number; // symbols passing the volume floor
  totalSymbols: number; // all USDT-perp symbols returned by Bitget
  stage2Count: number; // symbols enriched with K-line indicators
  factored: FactoredRow[];
}

const SHORTLIST_PER_SIDE = 18; // top-N long + top-N short candidates get Stage 2
const BATCH = 10; // concurrent candle fetches per wave

function toRaw(t: BitgetTicker): RawRow {
  return {
    symbol: t.symbol,
    lastPr: +t.lastPr,
    change24h: +t.change24h,
    fundingRate: +t.fundingRate,
    quoteVolume: +t.quoteVolume,
    holdingAmount: +t.holdingAmount,
    high24h: +t.high24h,
    low24h: +t.low24h,
    markPrice: +t.markPrice,
  };
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const wave = await Promise.allSettled(items.slice(i, i + size).map(fn));
    for (const r of wave) if (r.status === "fulfilled") out.push(r.value);
  }
  return out;
}

/** Stage 2: pull K-lines for one symbol and derive trend / RSI / multi-period momentum. */
async function enrich(row: RawRow): Promise<void> {
  const candles = await getCandles(row.symbol, "1H", 200);
  const ordered = [...candles].sort((a, b) => +a[0] - +b[0]).map((c) => +c[4]);
  const e50 = ema(ordered, 50);
  const last = ordered[ordered.length - 1];
  if (Number.isFinite(e50) && e50 > 0 && Number.isFinite(last)) {
    row.trendRaw = (last - e50) / e50;
  }
  const r = rsi(ordered, 14);
  if (Number.isFinite(r)) row.rsiRaw = r;
  row.momMultiRaw = 0.4 * pctChange(ordered, 4) + 0.6 * pctChange(ordered, 24);
}

/**
 * Two-stage build:
 *  1. One tickers call → Stage-1 factors for every symbol passing the volume floor.
 *  2. Shortlist (top/bottom by bias) → K-line enrichment → re-factor the universe.
 */
export async function buildUniverse(minVolume = 0): Promise<Universe> {
  const tickers = await getTickers();
  const totalSymbols = tickers.length;

  const rows: RawRow[] = tickers
    .map(toRaw)
    .filter((r) => r.lastPr > 0 && r.quoteVolume > 0 && r.quoteVolume >= minVolume);

  // Roll OI snapshots and attach ΔOI (0 on cold start until a second sample lands).
  for (const r of rows) {
    recordOi(r.symbol, r.holdingAmount);
    if (oiSampleCount(r.symbol) >= 2) r.deltaOi = deltaOiPct(r.symbol);
  }

  // Stage-1 ranking by directional bias to pick the shortlist.
  const stage1 = computeFactors(rows).map((fr) => combine(fr, DEFAULT_WEIGHTS));
  const byBias = [...stage1].sort((a, b) => b.bias - a.bias);
  const longCands = byBias.slice(0, SHORTLIST_PER_SIDE);
  const shortCands = byBias.slice(-SHORTLIST_PER_SIDE);
  const shortlist = new Set([...longCands, ...shortCands].map((s) => s.symbol));

  // Stage-2 enrichment, best-effort (rate-limit / missing data never breaks the build).
  const targets = rows.filter((r) => shortlist.has(r.symbol));
  await inBatches(targets, BATCH, (r) => enrich(r).catch(() => undefined));

  const factored = computeFactors(rows);

  return {
    generatedAt: new Date().toISOString(),
    universeSize: rows.length,
    totalSymbols,
    stage2Count: factored.filter((f) => f.stage2).length,
    factored,
  };
}
