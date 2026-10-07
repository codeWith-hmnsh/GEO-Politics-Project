"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePulse } from "@/lib/api";
import type { IndexedCountry } from "@/lib/geo/countries";
import { REL_COLORS, relationsFor, type RelStatus } from "@/lib/relations";
import { useGlobe } from "@/lib/store";
import { arcCurve, arcMaterial, glowTexture, headProgress, surfaceCurve } from "../fx";
import { prefersReducedMotion } from "../shared";
import { useHomeLayerVisible } from "./WarsLayer";

const ARC_LIMITS: Record<Exclude<RelStatus, "neutral">, number> = { ally: 8, hostile: 3, mixed: 3 };

function HostileBorder({ line, dashed, fade }: { line: [number, number][]; dashed: boolean; fade: React.RefObject<number> }) {
  const curve = useMemo(() => surfaceCurve(line), [line]);
  const core = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.0024, 6, false), [curve]);
  const halo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.007, 6, false), [curve]);
  const coreMat = useMemo(() => arcMaterial({ color: "#ff3b30", dash: dashed, dashCount: 40, speed: 0.4, base: 0.95 }), [dashed]);
  const haloMat = useMemo(() => arcMaterial({ color: "#ff3b30", base: 0.22, trail: 0.001, period: 99 }), []);
  useFrame(({ clock }) => {
    coreMat.uniforms.uTime.value = clock.elapsedTime;
    coreMat.uniforms.uFade.value = fade.current ?? 1;
    haloMat.uniforms.uFade.value = fade.current ?? 1;
  });
  return (
    <>
      <mesh geometry={halo} material={haloMat} renderOrder={3} />
      <mesh geometry={core} material={coreMat} renderOrder={4} />
    </>
  );
}

export function RelationArc({ from, to, color, index }: { from: [number, number]; to: [number, number]; color: string; index: number }) {
  const [reduce] = useState(prefersReducedMotion);
  const period = 2.8 + index * 0.09;
  const offset = index * 0.24;
  const curve = useMemo(() => arcCurve(from, to), [from, to]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, Math.max(40, curve.points.length * 2), 0.0022, 6, false), [curve]);
  const material = useMemo(() => arcMaterial({ color, additive: true, period, offset, trail: 0.4, base: 0.32 }), [color, period, offset]);
  const head = useRef<THREE.Sprite>(null);
  const born = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    born.current ??= t;
    material.uniforms.uTime.value = reduce ? 0 : t;
    material.uniforms.uFade.value = Math.min(1, (t - born.current) / 0.6);
    const h = headProgress(t, period, offset);
    if (head.current) {
      head.current.visible = !reduce && h <= 1;
      if (h <= 1) head.current.position.copy(curve.getPointAt(h));
    }
  });
  return (
    <>
      <mesh geometry={geometry} material={material} renderOrder={5} />
      <sprite ref={head} renderOrder={9} scale={0.04}>
        <spriteMaterial map={glowTexture()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

/** Home layer 4 (UI-DESIGN §4.3): hostile borders by default; arcs to partners and rivals on country tap. */
export function RelationsLayer({ countries }: { countries: IndexedCountry[] }) {
  const { data } = usePulse();
  const visible = useHomeLayerVisible("rel");
  const selected = useGlobe((s) => (s.mode === "home" || (s.mode === "diplomacy" && s.diplo.view === "relations") ? s.selectedIso3 : null));
  const fade = useRef(0);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    fade.current += ((visible ? 1 : 0) - fade.current) * Math.min(1, dt / 0.18);
    if (group.current) group.current.visible = fade.current > 0.01;
  });

  const arcs = useMemo(() => {
    if (!selected || !data) return [];
    const byIso = new Map(countries.map((c) => [c.iso3, c]));
    const origin = byIso.get(selected);
    if (!origin) return [];
    const rows = [...relationsFor(selected, data.data.relations, data.data.organizations).values()];
    return (Object.keys(ARC_LIMITS) as (keyof typeof ARC_LIMITS)[]).flatMap((status) =>
      rows
        .filter((r) => r.status === status && byIso.has(r.iso3))
        .slice(0, ARC_LIMITS[status])
        .map((r) => ({ key: `${selected}-${r.iso3}`, from: origin.centroid, to: byIso.get(r.iso3)!.centroid, color: REL_COLORS[status] })),
    );
  }, [selected, data, countries]);

  return (
    <>
      <group ref={group}>
        {(data?.data.borders.hostile ?? []).map((b) => (
          <HostileBorder key={b.id} line={b.line as [number, number][]} dashed={b.dashed} fade={fade} />
        ))}
      </group>
      {arcs.map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={a.color} index={i} />
      ))}
    </>
  );
}
