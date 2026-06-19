// Rolling open-interest snapshots per symbol, used to derive ΔOI.
// Bitget exposes no historical OI endpoint, so we sample it on every snapshot
// refresh and diff against the oldest retained sample.

interface OiSample {
  ts: number;
  oi: number;
}

const MAX_SAMPLES = 30;
const buffer = new Map<string, OiSample[]>();

/** Append the latest OI reading for a symbol (trimming to MAX_SAMPLES). */
export function recordOi(symbol: string, oi: number, ts = Date.now()) {
  if (!Number.isFinite(oi) || oi <= 0) return;
  const arr = buffer.get(symbol) ?? [];
  arr.push({ ts, oi });
  if (arr.length > MAX_SAMPLES) arr.shift();
  buffer.set(symbol, arr);
}

/**
 * Fractional OI change vs. the oldest retained sample.
 * Returns 0 on cold start (fewer than 2 samples) — by design, per SPEC.
 */
export function deltaOiPct(symbol: string): number {
  const arr = buffer.get(symbol);
  if (!arr || arr.length < 2) return 0;
  const oldest = arr[0].oi;
  const latest = arr[arr.length - 1].oi;
  if (!oldest) return 0;
  return (latest - oldest) / oldest;
}

export function oiSampleCount(symbol: string): number {
  return buffer.get(symbol)?.length ?? 0;
}
