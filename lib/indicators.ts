// Minimal technical indicators (self-contained, no external dep).

/** Exponential moving average; returns the latest value (NaN if insufficient data). */
export function ema(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const k = 2 / (period + 1);
  // Seed with SMA of the first `period` values.
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/** Wilder's RSI on close prices; returns latest value in [0,100] (NaN if insufficient). */
export function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return NaN;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Simple return over the last `n` bars: (last - close[-n]) / close[-n]. */
export function pctChange(closes: number[], n: number): number {
  if (closes.length <= n) return 0;
  const a = closes[closes.length - 1 - n];
  const b = closes[closes.length - 1];
  if (!a) return 0;
  return (b - a) / a;
}
