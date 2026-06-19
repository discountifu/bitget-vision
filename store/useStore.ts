import { create } from "zustand";
import { DEFAULT_WEIGHTS, type Weights, type FactoredRow } from "@/lib/scoring";
import type { AxisKey } from "@/lib/viz";

export interface SnapshotData {
  nodes: FactoredRow[];
  universe: number;
  totalSymbols: number;
  stage2Count: number;
  generatedAt: string;
  bitgetCalls: number;
}

interface State {
  data: SnapshotData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  weights: Weights;
  axes: { x: AxisKey; y: AxisKey; z: AxisKey };
  universeSize: number; // top-N by volume shown in the field
  autoRefresh: boolean;
  selected: string | null;
  hovered: string | null;
  refreshNonce: number;

  setData: (d: SnapshotData) => void;
  requestRefresh: () => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setWeight: (k: keyof Weights, v: number) => void;
  resetWeights: () => void;
  setAxis: (axis: "x" | "y" | "z", key: AxisKey) => void;
  setUniverseSize: (n: number) => void;
  toggleAuto: () => void;
  setSelected: (s: string | null) => void;
  setHovered: (s: string | null) => void;
}

export const useStore = create<State>((set) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  weights: { ...DEFAULT_WEIGHTS },
  axes: { x: "mom", y: "oi", z: "fund" },
  universeSize: 160,
  autoRefresh: true,
  selected: null,
  hovered: null,
  refreshNonce: 0,

  setData: (d) => set({ data: d, error: null, lastFetched: Date.now() }),
  requestRefresh: () => set((s) => ({ refreshNonce: s.refreshNonce + 1 })),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e }),
  setWeight: (k, v) => set((s) => ({ weights: { ...s.weights, [k]: v } })),
  resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
  setAxis: (axis, key) => set((s) => ({ axes: { ...s.axes, [axis]: key } })),
  setUniverseSize: (n) => set({ universeSize: n }),
  toggleAuto: () => set((s) => ({ autoRefresh: !s.autoRefresh })),
  setSelected: (s) => set({ selected: s }),
  setHovered: (s) => set({ hovered: s }),
}));
