"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePulse } from "@/lib/api";
import type { PulseConflict } from "@/lib/data/pulse";
import { latLngToVec3 } from "@/lib/geo/sphere";
import { useGlobe } from "@/lib/store";
import { arcCurve, arcMaterial, glowTexture, headProgress, ringTexture } from "../fx";
import { prefersReducedMotion } from "../shared";

const GLOW_SIZE = [0, 0.09, 0.15, 0.24];
const MAX_ARCS = 12;

/** Is the Home layer visible right now (switch on, Home mode, no country in focus)? */
export function useHomeLayerVisible(id: "wars" | "orgs" | "econ" | "rel") {
  return useGlobe((s) => s.layers[id] && s.mode === "home" && s.selectedIso3 === null);
}

function Hotspot({ c, index, fade }: { c: PulseConflict; index: number; fade: React.RefObject<number> }) {
  const glow = useRef<THREE.Sprite>(null);
  const ring = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Sprite>(null);
  const pos = useMemo(() => new THREE.Vector3(...latLngToVec3(c.at[0], c.at[1], 1.006)), [c.at]);
  const size = GLOW_SIZE[c.intensity] ?? 0.12;
  const [reduce] = useState(prefersReducedMotion);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = reduce ? 0.5 : (t * 0.6 + index * 0.37) % 1;
    const f = fade.current ?? 1;
    // Keep hotspots a similar size on screen when the camera comes close.
    const zoom = Math.max(0.3, Math.min(1, (useGlobe.getState().camera.dist - 1) / 1.6));
    const s = size * zoom;
    if (core.current) core.current.scale.setScalar(s * 0.22);
    if (ring.current) {
      ring.current.scale.setScalar(s * (0.3 + 1.1 * p));
      (ring.current.material as THREE.SpriteMaterial).opacity = 0.8 * (1 - p) * f;
    }
    if (glow.current) {
      glow.current.scale.setScalar(s * (1 + 0.08 * Math.sin(t * 2 + index)));
      (glow.current.material as THREE.SpriteMaterial).opacity = 0.95 * f;
    }
    if (core.current) (core.current.material as THREE.SpriteMaterial).opacity = f;
  });

  return (
    <group position={pos}>
      <sprite ref={glow} renderOrder={9} scale={size}>
        <spriteMaterial map={glowTexture()} color="#ff2a1f" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={core} renderOrder={10} scale={size * 0.22}>
        <spriteMaterial map={glowTexture()} color="#ffe2b0" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={ring} renderOrder={10}>
        <spriteMaterial map={ringTexture()} color="#ff4a3d" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Symbolic strike arc: tube with a travelling bright head and an impact ring at the target. */
function StrikeArc({ from, to, index, fade }: { from: [number, number]; to: [number, number]; index: number; fade: React.RefObject<number> }) {
  const period = 2.4 + index * 0.17;
  const offset = index * 0.53;
  const curve = useMemo(() => arcCurve(from, to), [from, to]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, Math.max(40, curve.points.length * 2), 0.0024, 6, false), [curve]);
  const material = useMemo(
    () => arcMaterial({ color: "#ff3b30", additive: true, period, offset, trail: 0.42, base: 0.14 }),
    [period, offset],
  );
  const head = useRef<THREE.Sprite>(null);
  const impact = useRef<THREE.Sprite>(null);
  const end = useMemo(() => curve.getPointAt(1), [curve]);
  const [reduce] = useState(prefersReducedMotion);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = fade.current ?? 1;
    material.uniforms.uTime.value = reduce ? 0 : t;
    material.uniforms.uFade.value = f;
    const h = headProgress(t, period, offset);
    if (head.current) {
      head.current.visible = !reduce && h <= 1;
      if (h <= 1) head.current.position.copy(curve.getPointAt(h));
      (head.current.material as THREE.SpriteMaterial).opacity = f;
    }
    if (impact.current) {
      const q = (h - 1) / 0.3;
      impact.current.visible = !reduce && h > 1;
      impact.current.scale.setScalar(0.02 + 0.12 * Math.max(0, q));
      (impact.current.material as THREE.SpriteMaterial).opacity = (1 - q) * f;
    }
  });

  return (
    <>
      <mesh geometry={geometry} material={material} renderOrder={5} />
      <sprite ref={head} renderOrder={9} scale={0.045}>
        <spriteMaterial map={glowTexture()} color="#ff3b30" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={impact} position={end} renderOrder={9}>
        <spriteMaterial map={ringTexture()} color="#ff3b30" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

/** Home layer 1 (UI-DESIGN §4.3): conflict glows, pulse rings and symbolic strike arcs. */
export function WarsLayer() {
  const { data } = usePulse();
  const visible = useHomeLayerVisible("wars");
  const fade = useRef(0);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    fade.current += ((visible ? 1 : 0) - fade.current) * Math.min(1, dt / 0.18);
    if (group.current) group.current.visible = fade.current > 0.01;
  });

  const conflicts = data?.data.conflicts ?? [];
  const arcs = conflicts.filter((c) => c.strikesActive).flatMap((c) => c.strikes as [number, number][][]).slice(0, MAX_ARCS);

  return (
    <group ref={group}>
      {conflicts.map((c, i) => (
        <Hotspot key={c.id} c={c} index={i} fade={fade} />
      ))}
      {arcs.map(([from, to], i) => (
        <StrikeArc key={`${from}-${to}`} from={from as [number, number]} to={to as [number, number]} index={i} fade={fade} />
      ))}
    </group>
  );
}
