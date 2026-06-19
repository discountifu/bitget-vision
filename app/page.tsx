"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/store/useStore";
import { useI18n } from "@/lib/i18n";
import ControlPanel from "@/components/ControlPanel";
import DetailPanel from "@/components/DetailPanel";
import HoverCard from "@/components/HoverCard";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Three.js can't render on the server; load the scene client-only.
const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground" />
  ),
});

const SNAPSHOT_MIN_VOLUME = 1_000_000;
const REFRESH_MS = 20_000;

export default function Page() {
  const { t } = useI18n();
  const setData = useStore((s) => s.setData);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);
  const autoRefresh = useStore((s) => s.autoRefresh);
  const refreshNonce = useStore((s) => s.refreshNonce);
  const error = useStore((s) => s.error);
  const data = useStore((s) => s.data);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market/snapshot?minVolume=${SNAPSHOT_MIN_VOLUME}`);
        const json = await res.json();
        if (!alive) return;
        if (json.error) setError(json.error);
        else setData(json);
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = autoRefresh ? setInterval(load, REFRESH_MS) : null;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [autoRefresh, refreshNonce, setData, setLoading, setError]);

  return (
    <main className="dark relative h-svh w-screen overflow-hidden bg-[#070a12] text-white">
      <div className="absolute inset-0">
        <Scene />
      </div>

      {/* Header */}
      <header className="pointer-events-none absolute top-0 right-0 left-0 flex items-start justify-between p-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Bitget <span className="text-emerald-400">{t("app.titleAccent")}</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">{t("app.subtitle")}</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34ff86]" />
              {t("legend.long")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_#ff4d72]" />
              {t("legend.short")}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Left controls */}
      <div className="pointer-events-none absolute top-20 left-4 bottom-4 flex flex-col justify-start">
        <ControlPanel />
      </div>

      {/* Right detail */}
      <div className="absolute top-20 right-4 flex flex-col gap-3">
        <DetailPanel />
      </div>

      {/* Bottom-left hover */}
      <div className="absolute bottom-4 left-4">
        <HoverCard />
      </div>

      {/* Footer disclaimer */}
      <div className="pointer-events-none absolute right-4 bottom-3 text-[10px] text-muted-foreground/70">
        {t("footer.disclaimer")}
      </div>

      {error && !data && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-rose-500/40 bg-black/70 px-4 py-3 text-sm text-rose-300">
            {t("error.loadFailed")} {error}
          </div>
        </div>
      )}
    </main>
  );
}
