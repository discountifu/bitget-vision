"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useScene } from "@/hooks/useScene";
import FactorBars from "./FactorBars";

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

export default function HoverCard() {
  const hovered = useStore((s) => s.hovered);
  const { scored } = useScene();
  const node = useMemo(() => scored.find((s) => s.symbol === hovered), [scored, hovered]);
  if (!node) return null;

  return (
    <div className="pointer-events-none w-64 rounded-xl border border-white/10 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-sm font-bold">{node.symbol}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {pct(+node.snapshot.change24h)}
        </span>
      </div>
      <div className="mb-2 flex gap-3 font-mono text-[11px]">
        <span style={{ color: "#9dffc6" }}>L {node.longScore.toFixed(1)}</span>
        <span style={{ color: "#ffb3c4" }}>S {node.shortScore.toFixed(1)}</span>
      </div>
      <FactorBars s={node} />
    </div>
  );
}
