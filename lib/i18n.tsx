"use client";

// Lightweight client-side i18n. No routing/locale segments — this is a single
// page client app, so a context + dictionary is enough. Initial locale is "en"
// (matches SSR output → hydration-safe); after mount we resolve the stored
// choice or the browser language and re-render.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "en" | "zh";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

const STORAGE_KEY = "bv.locale";

const en = {
  "app.titleAccent": "3D Strength Map",
  "app.subtitle": "USDT-perp star map · multi-factor long/short signal engine",

  "legend.long": "Long",
  "legend.short": "Short",

  "footer.disclaimer": "Public Bitget market data · scores are data viz, not investment advice",
  "error.loadFailed": "Failed to load market data:",
  "scene.initializing": "initializing star map…",

  "panel.axisMapping": "Axis mapping",
  "panel.factorWeights": "Factor weights",
  "panel.reset": "reset",
  "panel.universe": "Universe",
  "panel.all": "All",
  "panel.top": "Top {n}",
  "panel.autoOn": "● Auto 20s",
  "panel.autoOff": "○ Auto off",
  "panel.refresh": "Refresh",
  "panel.statUniverse": "Universe",
  "panel.statStage2": "Stage-2",
  "panel.statCalls": "Bitget calls",
  "panel.statUpdated": "Updated",

  "factor.mom": "Momentum",
  "factor.trend": "Trend",
  "factor.oiConfirm": "ΔOI confirm",
  "factor.oi": "ΔOI",
  "factor.rsi": "RSI",
  "factor.fundCrowd": "Funding crowd",
  "factor.lsCrowd": "L/S crowd",

  "axis.mom": "Momentum (24h)",
  "axis.trend": "Trend (EMA50)",
  "axis.rsi": "RSI",
  "axis.oi": "ΔOI confirm",
  "axis.fund": "Funding rate",
  "axis.volume": "Liquidity (volume)",
  "axis.net": "Net score",
  "axis.long": "Long score",
  "axis.short": "Short score",

  "detail.long": "LONG",
  "detail.short": "SHORT",
  "detail.loadingKlines": "loading K-lines…",
  "detail.noKlines": "no K-line data",
  "detail.h24": "24h",
  "detail.funding": "Funding",
  "detail.volume": "Volume",
  "detail.oi": "OI",
  "detail.factorBreakdown": "Factor breakdown",
  "detail.stage1": "(Stage 1)",
  "detail.stage2": "(Stage 2)",
  "detail.trade": "Trade on Bitget",

  "lang.label": "Language",
} as const;

export type MessageKey = keyof typeof en;

const zh: Record<MessageKey, string> = {
  "app.titleAccent": "3D 强度星图",
  "app.subtitle": "USDT 永续星图 · 多因子多空信号引擎",

  "legend.long": "做多",
  "legend.short": "做空",

  "footer.disclaimer": "公开 Bitget 行情数据 · 评分仅为数据可视化,非投资建议",
  "error.loadFailed": "行情数据加载失败:",
  "scene.initializing": "正在初始化星图…",

  "panel.axisMapping": "坐标轴映射",
  "panel.factorWeights": "因子权重",
  "panel.reset": "重置",
  "panel.universe": "标的范围",
  "panel.all": "全部",
  "panel.top": "前 {n}",
  "panel.autoOn": "● 自动 20s",
  "panel.autoOff": "○ 自动关闭",
  "panel.refresh": "刷新",
  "panel.statUniverse": "标的数",
  "panel.statStage2": "二阶段",
  "panel.statCalls": "Bitget 调用",
  "panel.statUpdated": "更新时间",

  "factor.mom": "动量",
  "factor.trend": "趋势",
  "factor.oiConfirm": "ΔOI 确认",
  "factor.oi": "ΔOI",
  "factor.rsi": "RSI",
  "factor.fundCrowd": "资金费拥挤",
  "factor.lsCrowd": "多空拥挤",

  "axis.mom": "动量 (24h)",
  "axis.trend": "趋势 (EMA50)",
  "axis.rsi": "RSI",
  "axis.oi": "ΔOI 确认",
  "axis.fund": "资金费率",
  "axis.volume": "流动性 (成交量)",
  "axis.net": "净分",
  "axis.long": "做多分",
  "axis.short": "做空分",

  "detail.long": "做多",
  "detail.short": "做空",
  "detail.loadingKlines": "正在加载 K 线…",
  "detail.noKlines": "暂无 K 线数据",
  "detail.h24": "24h",
  "detail.funding": "资金费",
  "detail.volume": "成交量",
  "detail.oi": "持仓量",
  "detail.factorBreakdown": "因子拆解",
  "detail.stage1": "(一阶段)",
  "detail.stage2": "(二阶段)",
  "detail.trade": "去 Bitget 交易",

  "lang.label": "语言",
};

const DICT: Record<Locale, Record<MessageKey, string>> = { en, zh };

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Resolve the real locale after mount (localStorage override → browser language).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const next = stored === "en" || stored === "zh" ? stored : detectLocale();
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let s = DICT[locale][key] ?? en[key] ?? key;
      if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
      return s;
    },
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
