"use client";

import type { Scored } from "@/lib/scoring";

const ROWS: { key: keyof Scored["factors"]; label: string }[] = [
  { key: "mom", label: "Momentum" },
  { key: "trend", label: "Trend" },
  { key: "oi", label: "ΔOI" },
  { key: "rsi", label: "RSI" },
  { key: "fundCrowd", label: "Funding crowd" },
  { key: "lsCrowd", label: "L/S crowd" },
];

const SCALE = 0.3; // contribution magnitude that fills the bar

export default function FactorBars({ s }: { s: Scored }) {
  return (
    <div className="flex flex-col gap-1">
      {ROWS.map(({ key, label }) => {
        const v = s.factors[key];
        const pct = Math.min(Math.abs(v) / SCALE, 1) * 50;
        const pos = v >= 0;
        return (
          <div key={key} className="flex items-center gap-2 text-[10px]">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <div className="relative h-2 flex-1 rounded-sm bg-white/5">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
              <div
                className="absolute top-0 bottom-0 rounded-sm"
                style={{
                  left: pos ? "50%" : `${50 - pct}%`,
                  width: `${pct}%`,
                  background: pos ? "#34ff86" : "#ff4d72",
                }}
              />
            </div>
            <span
              className="w-12 shrink-0 text-right font-mono"
              style={{ color: pos ? "#9dffc6" : "#ffb3c4" }}
            >
              {v >= 0 ? "+" : ""}
              {v.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
