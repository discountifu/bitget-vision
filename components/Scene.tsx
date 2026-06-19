"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import NodeField from "./NodeField";
import Highlights from "./Highlights";
import { useScene } from "@/hooks/useScene";
import { useStore } from "@/store/useStore";
import { AXIS_OPTIONS } from "@/lib/viz";

const labelOf = (key: string) => AXIS_OPTIONS.find((o) => o.key === key)?.label ?? key;

function AxisLabels() {
  const axes = useStore((s) => s.axes);
  const tag = (text: string, pos: [number, number, number], color: string) => (
    <Html position={pos} center distanceFactor={12} occlude={false}>
      <div
        className="font-mono text-[10px] tracking-wide whitespace-nowrap"
        style={{ color }}
      >
        {text}
      </div>
    </Html>
  );
  return (
    <>
      {tag(`X · ${labelOf(axes.x)}`, [6.2, -6, -6], "#7fb2ff")}
      {tag(`Y · ${labelOf(axes.y)}`, [-6, 6.2, -6], "#7dffb0")}
      {tag(`Z · ${labelOf(axes.z)}`, [-6, -6, 6.2], "#ff9ec4")}
    </>
  );
}

function World() {
  const { scored, positions, longTop, shortTop } = useScene();
  return (
    <>
      <color attach="background" args={["#070a12"]} />
      <fog attach="fog" args={["#070a12", 18, 40]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={40} />
      <gridHelper args={[16, 16, "#1b2436", "#0e1420"]} position={[0, -6, 0]} />
      <NodeField scored={scored} positions={positions} />
      <Highlights longTop={longTop} shortTop={shortTop} positions={positions} />
      <AxisLabels />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={45} minDistance={4} />
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.55} luminanceSmoothing={0.15} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [8, 6, 10], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <World />
    </Canvas>
  );
}
