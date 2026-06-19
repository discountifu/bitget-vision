"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
import type { Scored } from "@/lib/scoring";
import { nodeColor, nodeRadius, netScore } from "@/lib/viz";
import { useStore } from "@/store/useStore";

export default function NodeField({
  scored,
  positions,
}: {
  scored: Scored[];
  positions: Map<string, [number, number, number]>;
}) {
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const hovered = useStore((s) => s.hovered);
  const selected = useStore((s) => s.selected);

  // Stable per-symbol color objects.
  const colors = useMemo(() => {
    const m = new Map<string, THREE.Color>();
    for (const s of scored) {
      const [r, g, b] = nodeColor(netScore(s));
      m.set(s.symbol, new THREE.Color(r, g, b));
    }
    return m;
  }, [scored]);

  if (scored.length === 0) return null;

  return (
    <Instances limit={1000} range={scored.length}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial toneMapped={false} />
      {scored.map((s) => {
        const pos = positions.get(s.symbol) ?? [0, 0, 0];
        const active = hovered === s.symbol || selected === s.symbol;
        const r = nodeRadius(s) * (active ? 1.7 : 1);
        return (
          <Instance
            key={s.symbol}
            position={pos}
            scale={r}
            color={colors.get(s.symbol)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(s.symbol);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHovered(null);
              document.body.style.cursor = "default";
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(s.symbol);
            }}
          />
        );
      })}
    </Instances>
  );
}
