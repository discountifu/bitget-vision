import { LRUCache } from "lru-cache";
import { logBitgetCall } from "@/lib/logger";

const BASE = "https://api.bitget.com";

// Single shared cache; per-call ttl overrides the default.
const cache = new LRUCache<string, object>({ max: 1000, ttl: 20_000 });

let cumulativeCalls = 0; // real outbound calls this process

/**
 * The ONLY outbound gate to Bitget. Every call (cache hit or real network)
 * writes one structured log line; only real network calls increment the
 * cumulative counter. Do not fetch Bitget anywhere else.
 */
async function get<T = unknown>(path: string, ttl = 20_000): Promise<T> {
  const url = `${BASE}${path}`;
  const startedAt = Date.now();

  if (cache.has(path)) {
    logBitgetCall({
      ts: startedAt,
      url,
      endpoint: path,
      cacheHit: true,
      latencyMs: 0,
      cumulativeCalls,
    });
    return cache.get(path) as T;
  }

  const callSeq = ++cumulativeCalls;
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const json = await res.json();
    logBitgetCall({
      ts: startedAt,
      url,
      endpoint: path,
      cacheHit: false,
      status: res.status,
      bitgetCode: json.code,
      latencyMs: Date.now() - startedAt,
      callSeq,
      cumulativeCalls,
    });
    if (json.code !== "00000") throw new Error(`Bitget ${json.code}: ${json.msg}`);
    cache.set(path, json.data, { ttl });
    return json.data as T;
  } catch (err) {
    logBitgetCall({
      ts: startedAt,
      url,
      endpoint: path,
      cacheHit: false,
      status: -1,
      error: String(err),
      latencyMs: Date.now() - startedAt,
      callSeq,
      cumulativeCalls,
    });
    throw err;
  }
}

export interface BitgetTicker {
  symbol: string;
  lastPr: string;
  change24h: string; // fraction, e.g. "0.012"
  quoteVolume: string;
  usdtVolume: string;
  fundingRate: string;
  holdingAmount: string; // open interest, in base coin
  high24h: string;
  low24h: string;
  markPrice: string;
  indexPrice: string;
}

// Bitget candle rows: [ts, open, high, low, close, baseVol, quoteVol]
export type BitgetCandle = [string, string, string, string, string, string, string];

export interface BitgetLongShort {
  longAccountRatio: string;
  shortAccountRatio: string;
  longShortAccountRatio: string;
  ts: string;
}

export const getTickers = () =>
  get<BitgetTicker[]>(`/api/v2/mix/market/tickers?productType=usdt-futures`, 20_000);

export const getCandles = (symbol: string, granularity = "1H", limit = 200) =>
  get<BitgetCandle[]>(
    `/api/v2/mix/market/candles?symbol=${symbol}&granularity=${granularity}&limit=${limit}&productType=usdt-futures`,
    60_000,
  );

export const getLongShort = (symbol: string, period = "1h") =>
  get<BitgetLongShort[]>(
    `/api/v2/mix/market/account-long-short?symbol=${symbol}&period=${period}&productType=usdt-futures`,
    300_000,
  );

export const bitgetCumulativeCalls = () => cumulativeCalls;
