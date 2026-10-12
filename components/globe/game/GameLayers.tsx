"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { REGION_DEFS } from "@/lib/game/engine/regions";
import type { Iso3, RegionId } from "@/lib/game/engine/types";
import { REGIONS, SEATS } from "@/lib/game/engine/types";
import { useGame } from "@/lib/game/store";
import { CAPITAL, GOOD_COLOR, SEAT_COLOR } from "@/lib/game/text";
import type { IndexedCountry } from "@/lib/geo/countries";
import { RelationArc } from "../layers/RelationsLayer";

const SANCTION = "#e5484d";

/**
 * Statecraft layers on the 1.0 globe (UI-DESIGN §7): your country in gold, partner regions tinted by
 * the leader's seat colour (World view and reveal), treaty flows and sanction arcs.
 */
export function GameLayers({ countries, size = 4096 }: { countries: IndexedCountry[]; size?: number }) {
  return (
    <>
      <GameOverlay countries={countries} size={size} />
      <GameArcs />
    </>
  );
}

function GameOverlay({ countries, size }: { countries: IndexedCountry[]; size: number }) {
  const { gl } = useThree();
  const world = useGame((s) => s.world);
  const me = useGame((s) => s.setup.me);
  const worldView = useGame((s) => s.worldView);
  const fxRegions = useGame((s) => s.fx.regions);
  const phase = useGame((s) => s.phase);
  const showcase = useGame((s) => s.showcase);

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
    const alpha = (a: number) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

    if (showcase) {
      for (const r of showcase.regions) for (const iso of REGION_DEFS[r.id].countries) fill(iso, SEAT_COLOR[r.seat] + alpha(0.28 + 0.4 * r.strength));
      fill(showcase.me, "#f2b33dc4");
    } else if (world && phase !== "pick") {
      const showRegions: RegionId[] = worldView ? [...REGIONS] : fxRegions;
      for (const r of showRegions) {
        const reg = world.regions[r];
        if (!reg.leader) continue;
        const a = 0.28 + 0.4 * (reg.sway[reg.leader] / 100);
        for (const iso of REGION_DEFS[r].countries) fill(iso, SEAT_COLOR[reg.leader] + alpha(a));
      }
      if (worldView) for (const s of SEATS) if (s !== me) fill(s, SEAT_COLOR[s] + "70");
      fill(me, "#f2b33dc4");
    } else if (phase === "pick") {
      fill(me, "#f2b33dc4");
    }
    texture.needsUpdate = true;
  }, [canvas, texture, gl, countries, world, me, worldView, fxRegions, phase, showcase]);

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1.0009, 200, 140]} />
      <meshLambertMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

type Arc = { key: string; from: [number, number]; to: [number, number]; color: string };

function GameArcs() {
  const world = useGame((s) => s.world);
  const me = useGame((s) => s.setup.me);
  const worldView = useGame((s) => s.worldView);
  const fxArcs = useGame((s) => s.fx.arcs);
  const phase = useGame((s) => s.phase);
  const showcase = useGame((s) => s.showcase);

  const arcs = useMemo<Arc[]>(() => {
    if (showcase) return showcase.arcs.map((a) => ({ key: a.key, from: CAPITAL[a.from], to: CAPITAL[a.to], color: a.kind === "sanction" ? SANCTION : GOOD_COLOR[a.good ?? "energy"] }));
    if (!world || phase === "pick") return [];
    const out = new Map<string, Arc>();
    const add = (key: string, from: Iso3, to: Iso3, color: string) => out.set(key, { key, from: CAPITAL[from], to: CAPITAL[to], color });
    if (phase === "reveal") {
      for (const a of fxArcs) add(a.key, a.from, a.to, a.kind === "sanction" ? SANCTION : GOOD_COLOR[a.good ?? "energy"]);
      return [...out.values()];
    }
    for (const t of world.treaties) {
      const mine = t.a === me || t.b === me;
      if (!mine && !worldView) continue;
      for (const [seller, buyer, terms] of [
        [t.a, t.b, t.aGives],
        [t.b, t.a, t.bGives],
      ] as const)
        for (const term of terms) if (term.kind === "goods") add(`${t.id}-${seller}-${term.good}`, seller, buyer, GOOD_COLOR[term.good]);
    }
    if (worldView)
      for (const a of SEATS) for (const b of SEATS) if (a !== b && world.pairs[a][b].sanction) add(`s-${a}-${b}`, a, b, SANCTION);
    return [...out.values()];
  }, [world, me, worldView, fxArcs, phase, showcase]);

  return (
    <>
      {arcs.map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={a.color} index={i} />
      ))}
    </>
  );
}
