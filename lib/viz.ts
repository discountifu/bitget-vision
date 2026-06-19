import type { Scored } from "@/lib/scoring";

// Maps scored symbols onto the 3D scene: axis values, colors, sizes, layout.

export type AxisKey =
  | "mom"
  | "trend"
  | "rsi"
  | "oi"
  | "fund"
  | "volume"
  | "net"
  | "long"
  | "short";

export const AXIS_OPTIONS: { key: AxisKey; label: string }[] = [
  { key: "mom", label: "Momentum (24h)" },
  { key: "trend", label: "Trend (EMA50)" },
  { key: "rsi", label: "RSI" },
  { key: "oi", label: "ΔOI confirm" },
  { key: "fund", label: "Funding rate" },
  { key: "volume", label: "Liquidity (volume)" },
  { key: "net", label: "Net score" },
  { key: "long", label: "Long score" },
  { key: "short", label: "Short score" },
];

export function axisValue(s: Scored, key: AxisKey): number {
  switch (key) {
    case "mom":
      return s.raw.mom;
    case "trend":
      return s.raw.trend;
    case "rsi":
      return s.raw.rsi;
    case "oi":
      return s.raw.oi;
    case "fund":
      return s.raw.fundZ;
    case "volume":
      return Math.log(Math.max(+s.snapshot.volume, 1));
    case "net":
      return (s.longScore - s.shortScore) / 100;
    case "long":
      return s.longScore;
    case "short":
      return s.shortScore;
  }
}

export const netScore = (s: Scored) => (s.longScore - s.shortScore) / 100;

const GREY: [number, number, number] = [0.34, 0.38, 0.46];
const GREEN: [number, number, number] = [0.16, 1.0, 0.45];
const RED: [number, number, number] = [1.0, 0.18, 0.36];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Net-score → RGB (grey neutral → green long / red short). t boosted since live scores are modest. */
export function nodeColor(net: number, boost = 2.6): [number, number, number] {
  const t = Math.min(Math.abs(net) * boost, 1);
  const target = net >= 0 ? GREEN : RED;
  return [lerp(GREY[0], target[0], t), lerp(GREY[1], target[1], t), lerp(GREY[2], target[2], t)];
}

/** Sphere radius from liquidity gate. */
export const nodeRadius = (s: Scored) => 0.08 + s.liqGate * 0.16;

const SPAN = 5;

/** Min-max normalize each axis across the displayed set, mapping to [-SPAN, SPAN]. */
export function computeLayout(
  scored: Scored[],
  axes: { x: AxisKey; y: AxisKey; z: AxisKey },
): [number, number, number][] {
  const axis = (key: AxisKey) => {
    const vals = scored.map((s) => axisValue(s, key));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return vals.map((v) => ((v - min) / span) * 2 * SPAN - SPAN);
  };
  const xs = axis(axes.x);
  const ys = axis(axes.y);
  const zs = axis(axes.z);
  return scored.map((_, i) => [xs[i], ys[i], zs[i]]);
}
