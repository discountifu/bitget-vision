// Transparent, explainable scoring engine. Shared by server (snapshot/signals)
// and client (live re-scoring when weight sliders change).
//
// Pipeline: computeFactors() runs ONCE over the whole universe (cross-sectional
// normalization). combine() is pure per-symbol and re-runs cheaply on any weight
// change. Every factor is direction-aligned so positive = bullish.

export interface Weights {
  mom: number;
  trend: number;
  oi: number;
  rsi: number;
  fund: number;
  ls: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  mom: 0.3,
  trend: 0.25,
  oi: 0.2,
  rsi: 0.1,
  fund: 0.1,
  ls: 0.05,
};

export interface RawRow {
  symbol: string;
  lastPr: number;
  change24h: number; // fraction (0.012 = +1.2%)
  fundingRate: number;
  quoteVolume: number;
  holdingAmount: number;
  high24h: number;
  low24h: number;
  markPrice: number;
  // Stage-2 enrichment (present only for shortlist symbols).
  trendRaw?: number; // (close - EMA50) / EMA50
  rsiRaw?: number; // RSI 0..100
  momMultiRaw?: number; // blended multi-period return
  deltaOi?: number; // fractional ΔOI
  lsRaw?: number; // long/short account ratio
}

/** Normalized, direction-aligned factors, each roughly in [-1, 1]. */
export interface Factors {
  mom: number;
  trend: number;
  oi: number;
  rsi: number;
  fundZ: number; // signed funding z (crowd split derives from sign)
  lsZ: number; // signed long/short z
}

export interface Snapshot {
  lastPr: string;
  change24h: string;
  fundingRate: string;
  oi: string;
  volume: string;
  markPrice: string;
}

export interface FactoredRow {
  symbol: string;
  factors: Factors;
  liqGate: number;
  stage2: boolean;
  snapshot: Snapshot;
}

/** Weighted contributions (long perspective) for the hover breakdown / API. */
export interface Contributions {
  mom: number;
  trend: number;
  oi: number;
  rsi: number;
  fundCrowd: number;
  lsCrowd: number;
}

export interface Scored {
  symbol: string;
  longScore: number;
  shortScore: number;
  bias: number;
  factors: Contributions;
  raw: Factors;
  liqGate: number;
  stage2: boolean;
  snapshot: Snapshot;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const m = Math.floor(n / 2);
  return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/**
 * Robust cross-sectional standardization: median/MAD z-score squashed by tanh
 * to [-1, 1]. Resistant to the outliers common in crypto tickers.
 */
export function robustZ(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const absDev = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = median(absDev);
  if (mad === 0) return values.map(() => 0);
  const scale = 1.4826 * mad;
  return values.map((v) => Math.tanh((v - med) / scale));
}

const TREND_K = 8;
const OI_K = 5;

/** Cross-sectional factor computation over the whole universe. */
export function computeFactors(rows: RawRow[]): FactoredRow[] {
  if (rows.length === 0) return [];

  const momInput = rows.map((r) =>
    r.momMultiRaw !== undefined ? 0.6 * r.change24h + 0.4 * r.momMultiRaw : r.change24h,
  );
  const momZ = robustZ(momInput);
  const fundZ = robustZ(rows.map((r) => r.fundingRate));

  // Liquidity gate from log volume, mapped to [0.3, 1].
  const logVol = rows.map((r) => Math.log(Math.max(r.quoteVolume, 1)));
  const minLv = Math.min(...logVol);
  const maxLv = Math.max(...logVol);
  const spanLv = maxLv - minLv || 1;

  return rows.map((r, i) => {
    const trend = r.trendRaw !== undefined ? Math.tanh(r.trendRaw * TREND_K) : 0;

    let rsi = 0;
    if (r.rsiRaw !== undefined) {
      const base = (r.rsiRaw - 50) / 50; // [-1, 1]
      rsi = base * (1 - 0.5 * base * base); // soft-decay near extremes
    }

    // sign(priceChange) * tanh(k·ΔOI): price up + OI up = confirmed breakout.
    const oi =
      r.deltaOi !== undefined && r.change24h !== 0
        ? Math.sign(r.change24h) * Math.tanh(r.deltaOi * OI_K)
        : 0;

    const lsZ = r.lsRaw !== undefined ? Math.tanh(r.lsRaw - 1) : 0;

    const liqGate = clamp(0.3 + 0.7 * ((logVol[i] - minLv) / spanLv), 0.3, 1);

    return {
      symbol: r.symbol,
      factors: { mom: momZ[i], trend, oi, rsi, fundZ: fundZ[i], lsZ },
      liqGate,
      stage2: r.trendRaw !== undefined,
      snapshot: {
        lastPr: String(r.lastPr),
        change24h: String(r.change24h),
        fundingRate: String(r.fundingRate),
        oi: String(r.holdingAmount),
        volume: String(r.quoteVolume),
        markPrice: String(r.markPrice),
      },
    };
  });
}

/** Pure per-symbol scoring given weights. Cheap; safe to run on every slider move. */
export function combine(fr: FactoredRow, w: Weights): Scored {
  const f = fr.factors;
  const bias = w.mom * f.mom + w.trend * f.trend + w.rsi * f.rsi + w.oi * f.oi;

  const fundCrowdLong = w.fund * Math.max(0, f.fundZ);
  const lsCrowdLong = w.ls * Math.max(0, f.lsZ);
  const crowdLong = fundCrowdLong + lsCrowdLong;
  const crowdShort = w.fund * Math.max(0, -f.fundZ) + w.ls * Math.max(0, -f.lsZ);

  const longScore = clamp01(bias - crowdLong) * fr.liqGate * 100;
  const shortScore = clamp01(-bias - crowdShort) * fr.liqGate * 100;

  return {
    symbol: fr.symbol,
    longScore,
    shortScore,
    bias,
    factors: {
      mom: w.mom * f.mom,
      trend: w.trend * f.trend,
      oi: w.oi * f.oi,
      rsi: w.rsi * f.rsi,
      fundCrowd: -fundCrowdLong,
      lsCrowd: -lsCrowdLong,
    },
    raw: f,
    liqGate: fr.liqGate,
    stage2: fr.stage2,
    snapshot: fr.snapshot,
  };
}

/** Convenience: factor + score the whole universe with one weight set. */
export function scoreAll(rows: RawRow[], w: Weights): Scored[] {
  return computeFactors(rows).map((fr) => combine(fr, w));
}
