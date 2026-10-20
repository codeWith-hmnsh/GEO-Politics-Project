"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { useQuiz } from "@/lib/game/quiz/store";
import type { IndexedCountry } from "@/lib/geo/countries";
import { RelationArc } from "../layers/RelationsLayer";

/** Then · Now · Next on the globe: once a question is answered, its countries light up and its arc draws. */
export function QuizLayers({ countries, size = 4096 }: { countries: IndexedCountry[]; size?: number }) {
  return (
    <>
      <QuizOverlay countries={countries} size={size} />
      <QuizArc />
    </>
  );
}

function QuizOverlay({ countries, size }: { countries: IndexedCountry[]; size: number }) {
  const { gl } = useThree();
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  const right = useQuiz((s) => s.answers[s.i]?.correct);

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
    if (phase === "reveal" && q) {
      const byIso = new Map(countries.map((c) => [c.iso3, c]));
      ctx.fillStyle = right ? "#2fa36bb0" : "#f2b33dc0";
      for (const iso of q.countries) {
        const c = byIso.get(iso);
        if (!c) continue;
        ctx.beginPath();
        for (const r of c.outer)
          for (const off of r.wrap ? [0, -W] : [0]) {
            r.pts.forEach(([lng, lat], i) => (i ? ctx.lineTo(X(lng) + off, Y(lat)) : ctx.moveTo(X(lng) + off, Y(lat))));
            ctx.closePath();
          }
        ctx.fill("evenodd");
      }
    }
    texture.needsUpdate = true;
  }, [canvas, texture, gl, countries, phase, q, right]);

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1.0009, 200, 140]} />
      <meshLambertMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function QuizArc() {
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  if (phase !== "reveal" || !q?.arc) return null;
  return <RelationArc key={q.id} from={q.arc[0]} to={q.arc[1]} color={ERA_LOOK[q.era].color} index={0} />;
}
