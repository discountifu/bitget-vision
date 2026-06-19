"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useScene } from "@/hooks/useScene";
import FactorBars from "./FactorBars";

interface Kline {
  ts: number;
  close: number;
}

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
const fmtVol = (x: number) =>
  x >= 1e9 ? `${(x / 1e9).toFixed(2)}B` : x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x.toFixed(0);

export default function DetailPanel() {
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const { scored } = useScene();
  const [klines, setKlines] = useState<Kline[]>([]);
  const [loading, setLoading] = useState(false);

  const node = useMemo(() => scored.find((s) => s.symbol === selected), [scored, selected]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setKlines([]);
      try {
        const r = await fetch(`/api/market/klines?symbol=${selected}&granularity=1H&limit=120`);
        const d = await r.json();
        if (alive) setKlines(d.candles ?? []);
      } catch {
        if (alive) setKlines([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selected]);

  if (!selected || !node) return null;

  const snap = node.snapshot;
  const up = +snap.change24h >= 0;

  return (
    <div className="pointer-events-auto flex w-80 flex-col gap-3 rounded-xl border border-white/10 bg-black/55 p-4 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold">{node.symbol}</h2>
          <p className="font-mono text-xs text-muted-foreground">${snap.lastPr}</p>
        </div>
        <button
          onClick={() => setSelected(null)}
          className="rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2">
        <ScoreChip label="LONG" value={node.longScore} color="#34ff86" />
        <ScoreChip label="SHORT" value={node.shortScore} color="#ff4d72" />
      </div>

      <div className="h-24 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            loading K-lines…
          </div>
        ) : klines.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={klines}>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Tooltip
                contentStyle={{
                  background: "#0b1018",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                labelFormatter={() => ""}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={up ? "#34ff86" : "#ff4d72"}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            no K-line data
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        <Stat label="24h" value={pct(+snap.change24h)} color={up ? "#9dffc6" : "#ffb3c4"} />
        <Stat label="Funding" value={pct(+snap.fundingRate)} />
        <Stat label="Volume" value={fmtVol(+snap.volume)} />
        <Stat label="OI" value={fmtVol(+snap.oi)} />
      </div>

      <div className="border-t border-white/10 pt-2">
        <h3 className="mb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Factor breakdown {node.stage2 ? "(Stage 2)" : "(Stage 1)"}
        </h3>
        <FactorBars s={node} />
      </div>
    </div>
  );
}

function ScoreChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex-1 rounded-lg border px-3 py-2"
      style={{ borderColor: `${color}55`, background: `${color}11` }}
    >
      <div className="text-[10px] tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color }}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
