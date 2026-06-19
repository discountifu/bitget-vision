"use client";

import { useStore } from "@/store/useStore";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { AXIS_OPTIONS } from "@/lib/viz";
import type { Weights } from "@/lib/scoring";

const WEIGHT_ROWS: { key: keyof Weights; labelKey: MessageKey }[] = [
  { key: "mom", labelKey: "factor.mom" },
  { key: "trend", labelKey: "factor.trend" },
  { key: "oi", labelKey: "factor.oiConfirm" },
  { key: "rsi", labelKey: "factor.rsi" },
  { key: "fund", labelKey: "factor.fundCrowd" },
  { key: "ls", labelKey: "factor.lsCrowd" },
];

const UNIVERSE_OPTIONS = [80, 160, 300, 9999];

function AxisSelect({ axis }: { axis: "x" | "y" | "z" }) {
  const { t } = useI18n();
  const value = useStore((s) => s.axes[axis]);
  const setAxis = useStore((s) => s.setAxis);
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="w-4 font-mono text-muted-foreground uppercase">{axis}</span>
      <select
        value={value}
        onChange={(e) => setAxis(axis, e.target.value as never)}
        className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] outline-none focus:border-white/30"
      >
        {AXIS_OPTIONS.map((o) => (
          <option key={o.key} value={o.key} className="bg-[#0b1018]">
            {t(`axis.${o.key}` as MessageKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ControlPanel() {
  const { t } = useI18n();
  const requestRefresh = useStore((s) => s.requestRefresh);
  const weights = useStore((s) => s.weights);
  const setWeight = useStore((s) => s.setWeight);
  const resetWeights = useStore((s) => s.resetWeights);
  const universeSize = useStore((s) => s.universeSize);
  const setUniverseSize = useStore((s) => s.setUniverseSize);
  const autoRefresh = useStore((s) => s.autoRefresh);
  const toggleAuto = useStore((s) => s.toggleAuto);
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);

  return (
    <div className="pointer-events-auto flex w-72 flex-col gap-4 rounded-xl border border-white/10 bg-black/55 p-4 text-white shadow-2xl backdrop-blur-md">
      <Section title={t("panel.axisMapping")}>
        <AxisSelect axis="x" />
        <AxisSelect axis="y" />
        <AxisSelect axis="z" />
      </Section>

      <Section
        title={t("panel.factorWeights")}
        action={
          <button
            onClick={resetWeights}
            className="text-[10px] text-muted-foreground hover:text-white"
          >
            {t("panel.reset")}
          </button>
        }
      >
        {WEIGHT_ROWS.map(({ key, labelKey }) => (
          <div key={key} className="flex items-center gap-2 text-[11px]">
            <span className="w-24 shrink-0 text-muted-foreground">{t(labelKey)}</span>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={weights[key]}
              onChange={(e) => setWeight(key, +e.target.value)}
              className="flex-1 accent-emerald-400"
            />
            <span className="w-8 text-right font-mono text-[10px]">
              {weights[key].toFixed(2)}
            </span>
          </div>
        ))}
      </Section>

      <Section title={t("panel.universe")}>
        <div className="flex gap-1">
          {UNIVERSE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setUniverseSize(n)}
              className={`flex-1 rounded-md border px-2 py-1 text-[11px] transition ${
                universeSize === n
                  ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                  : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/30"
              }`}
            >
              {n === 9999 ? t("panel.all") : t("panel.top", { n })}
            </button>
          ))}
        </div>
      </Section>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleAuto}
          className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition ${
            autoRefresh
              ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
              : "border-white/10 bg-black/30 text-muted-foreground"
          }`}
        >
          {autoRefresh ? t("panel.autoOn") : t("panel.autoOff")}
        </button>
        <button
          onClick={requestRefresh}
          disabled={loading}
          className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] hover:border-white/30 disabled:opacity-50"
        >
          {loading ? "…" : t("panel.refresh")}
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-1 border-t border-white/10 pt-2 font-mono text-[10px] text-muted-foreground">
          <span>{t("panel.statUniverse")}</span>
          <span className="text-right text-white">{data.universe}</span>
          <span>{t("panel.statStage2")}</span>
          <span className="text-right text-white">{data.stage2Count}</span>
          <span>{t("panel.statCalls")}</span>
          <span className="text-right text-white">{data.bitgetCalls}</span>
          <span>{t("panel.statUpdated")}</span>
          <span className="text-right text-white">
            {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
