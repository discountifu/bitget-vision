"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { combine, type Scored } from "@/lib/scoring";
import { computeLayout } from "@/lib/viz";

export interface SceneData {
  scored: Scored[];
  positions: Map<string, [number, number, number]>;
  longTop: Scored[];
  shortTop: Scored[];
}

const HIGHLIGHT_N = 3;

/** Derives the displayed universe (live-scored + laid out) from the raw snapshot. */
export function useScene(): SceneData {
  const data = useStore((s) => s.data);
  const weights = useStore((s) => s.weights);
  const axes = useStore((s) => s.axes);
  const universeSize = useStore((s) => s.universeSize);

  return useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { scored: [], positions: new Map(), longTop: [], shortTop: [] };
    }
    const all = data.nodes.map((fr) => combine(fr, weights));
    const displayed = [...all]
      .sort((a, b) => +b.snapshot.volume - +a.snapshot.volume)
      .slice(0, universeSize);

    const layout = computeLayout(displayed, axes);
    const positions = new Map<string, [number, number, number]>(
      displayed.map((s, i) => [s.symbol, layout[i]]),
    );

    const longTop = [...displayed].sort((a, b) => b.longScore - a.longScore).slice(0, HIGHLIGHT_N);
    const shortTop = [...displayed]
      .sort((a, b) => b.shortScore - a.shortScore)
      .slice(0, HIGHLIGHT_N);

    return { scored: displayed, positions, longTop, shortTop };
  }, [data, weights, axes, universeSize]);
}
