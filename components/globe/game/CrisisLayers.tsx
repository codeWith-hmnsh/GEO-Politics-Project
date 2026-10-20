"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CRISIS_BY_ID } from "@/lib/game/crisis/deck";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import { CAPITAL } from "@/lib/game/text";
import type { IndexedCountry } from "@/lib/geo/countries";
import { RelationArc } from "../layers/RelationsLayer";

/**
 * Crisis Table layers on the globe: your country in gold, and during the reveal every leader's country
 * takes the colour of the card it played, with an arc from its capital to the crisis when it acted.
 */
export function CrisisLayers({ countries, size = 4096 }: { countries: IndexedCountry[]; size?: number }) {
  return (
    <>
      <CrisisOverlay countries={countries} size={size} />
      <CrisisArcs />
    </>
  );
}

const SHOW_PICKS = new Set(["reveal", "result"]);

function CrisisOverlay({ countries, size }: { countries: IndexedCountry[]; size: number }) {
  const { gl } = useThree();
  const me = useCrisis((s) => s.me);
  const phase = useCrisis((s) => s.phase);
  const record = useCrisis((s) => s.record);
  const flipped = useCrisis((s) => s.flipped);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size / 2;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: t };
  }, [size]);

  useEffect(() => {
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const X = (lng: number) => ((lng + 180) / 360) * W;
    const Y = (lat: number) => ((90 - lat) / 180) * H;
    ctx.clearRect(0, 0, W, H);
    const byIso = new Map(countries.map((c) => [c.iso3, c]));
    const fill = (iso3: string, color: string) => {
      const c = byIso.get(iso3);
      if (!c) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const r of c.outer)
        for (const off of r.wrap ? [0, -W] : [0]) {
          r.pts.forEach(([lng, lat], i) => (i ? ctx.lineTo(X(lng) + off, Y(lat)) : ctx.moveTo(X(lng) + off, Y(lat))));
          ctx.closePath();
        }
      ctx.fill("evenodd");
    };
    if (record && SHOW_PICKS.has(phase)) {
      for (const s of flipped) fill(s, CHOICE_LOOK[record.picks[s]].color + (s === me ? "d0" : "a0"));
      if (!flipped.includes(me)) fill(me, "#f2b33dc4");
    } else if (phase !== "intro") {
      fill(me, "#f2b33dc4");
    }
    texture.needsUpdate = true;
  }, [canvas, texture, gl, countries, me, phase, record, flipped]);

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1.0009, 200, 140]} />
      <meshLambertMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function CrisisArcs() {
  const phase = useCrisis((s) => s.phase);
  const record = useCrisis((s) => s.record);
  const flipped = useCrisis((s) => s.flipped);
  if (!record || !SHOW_PICKS.has(phase)) return null;
  const c = CRISIS_BY_ID.get(record.crisisId)!;
  if (c.place.global) return null;
  const to: [number, number] = [c.place.lat, c.place.lng];
  return (
    <>
      {flipped
        .filter((s) => record.picks[s] === "coop" || record.picks[s] === "hard")
        .map((s, i) => (
          <RelationArc key={`${record.year}-${s}`} from={CAPITAL[s]} to={to} color={CHOICE_LOOK[record.picks[s]].color} index={i} />
        ))}
    </>
  );
}
