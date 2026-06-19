"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Scored } from "@/lib/scoring";
import { useStore } from "@/store/useStore";
import { useI18n } from "@/lib/i18n";

const FLOOR = -6;
const LONG = new THREE.Color(0.2, 1.0, 0.5);
const SHORT = new THREE.Color(1.0, 0.2, 0.42);

function Beacon({
  s,
  pos,
  kind,
  rank,
}: {
  s: Scored;
  pos: [number, number, number];
  kind: "long" | "short";
  rank: number;
}) {
  const halo = useRef<THREE.Mesh>(null);
  const color = kind === "long" ? LONG : SHORT;
  const score = kind === "long" ? s.longScore : s.shortScore;
  const setSelected = useStore((st) => st.setSelected);
  const { t } = useI18n();

  useFrame((state) => {
    if (!halo.current) return;
    const p = 1 + 0.18 * Math.sin(state.clock.elapsedTime * 2.5 + rank);
    halo.current.scale.setScalar(0.42 * p);
  });

  const beamH = pos[1] - FLOOR;

  return (
    <group position={pos}>
      {/* Glowing halo (picked up by Bloom) */}
      <mesh ref={halo}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Outer faint shell */}
      <mesh scale={0.7}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} />
      </mesh>
      {/* Light beam to the floor */}
      <mesh position={[0, -beamH / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, beamH, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.55, 0]} center distanceFactor={9} occlude={false}>
        <button
          onClick={() => setSelected(s.symbol)}
          className="cursor-pointer rounded-md border px-2 py-1 text-center font-mono text-[11px] leading-tight whitespace-nowrap shadow-lg backdrop-blur-sm"
          style={{
            borderColor: kind === "long" ? "#34ff86" : "#ff4d72",
            color: kind === "long" ? "#9dffc6" : "#ffb3c4",
            background: "rgba(7,10,18,0.78)",
          }}
        >
          <div className="font-bold">{s.symbol.replace("USDT", "")}</div>
          <div>
            {kind === "long" ? `▲ ${t("detail.long")}` : `▼ ${t("detail.short")}`}{" "}
            {score.toFixed(1)}
          </div>
        </button>
      </Html>
    </group>
  );
}

export default function Highlights({
  longTop,
  shortTop,
  positions,
}: {
  longTop: Scored[];
  shortTop: Scored[];
  positions: Map<string, [number, number, number]>;
}) {
  return (
    <>
      {longTop.map((s, i) => {
        const pos = positions.get(s.symbol);
        return pos ? <Beacon key={s.symbol} s={s} pos={pos} kind="long" rank={i} /> : null;
      })}
      {shortTop.map((s, i) => {
        const pos = positions.get(s.symbol);
        return pos ? <Beacon key={s.symbol} s={s} pos={pos} kind="short" rank={i} /> : null;
      })}
    </>
  );
}
