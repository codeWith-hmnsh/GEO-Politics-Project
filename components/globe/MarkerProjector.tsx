"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HEADER_SAFE_Y, markerRegistry } from "@/lib/markers";
import { useGlobe } from "@/lib/store";

type Box = { l: number; t: number; r: number; b: number };
const overlap = (a: Box, b: Box, pad = 6) => a.l < b.r + pad && a.r + pad > b.l && a.t < b.b + pad && a.b + pad > b.t;

/**
 * Callout cards (markers with a priority) must not cover each other or a panel. A few times a second the
 * visible cards are measured and the lower-priority one of any overlapping pair is hidden.
 */
function collisionPass() {
  const avoid: Box[] = [...document.querySelectorAll<HTMLElement>("[data-avoid]")]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
  const cards = [...markerRegistry.values()].filter((m) => m.priority !== undefined && m.last && m.last.x >= 0);
  cards.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const kept: Box[] = [];
  for (const m of cards) {
    const inner = (m.el.firstElementChild as HTMLElement | null) ?? m.el;
    const r = inner.getBoundingClientRect();
    const box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    const hide = r.width > 0 && (kept.some((k) => overlap(k, box)) || avoid.some((a) => overlap(a, box, 2)));
    m.collided = hide;
    if (!hide) kept.push(box);
  }
}

/** Projects registered DOM markers onto the screen each frame and hides those behind the globe. */
export function MarkerProjector() {
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), n: new THREE.Vector3(), toCam: new THREE.Vector3() }), []);
  const frame = useRef(0);

  useFrame(({ camera, size }) => {
    if (++frame.current % 8 === 0) collisionPass();
    const dist = useGlobe.getState().camera.dist;
    for (const m of markerRegistry.values()) {
      const out = (m.maxDist !== undefined && dist > m.maxDist) || (m.minDist !== undefined && dist < m.minDist);
      tmp.p.set(m.v[0], m.v[1], m.v[2]);
      tmp.n.copy(tmp.p).normalize();
      const facing = tmp.n.dot(tmp.toCam.copy(camera.position).sub(tmp.p).normalize());
      if (out || facing < 0.12) {
        if (m.last?.o !== 0) {
          m.el.style.opacity = "0";
          m.el.style.visibility = "hidden";
          m.last = { x: -1, y: -1, o: 0 };
        }
        continue;
      }
      tmp.p.project(camera);
      const x = ((tmp.p.x + 1) / 2) * size.width + (m.offset?.[0] ?? 0);
      const y = ((1 - tmp.p.y) / 2) * size.height + (m.offset?.[1] ?? 0);
      if (y < HEADER_SAFE_Y) {
        if (m.last?.o !== 0) {
          m.el.style.opacity = "0";
          m.el.style.visibility = "hidden";
          m.last = { x: -1, y: -1, o: 0 };
        }
        continue;
      }
      const o = m.collided ? 0 : Math.min(1, (facing - 0.12) * 5);
      if (m.last && m.last.f === m.flip && Math.abs(m.last.x - x) < 0.1 && Math.abs(m.last.y - y) < 0.1 && Math.abs(m.last.o - o) < 0.01) continue;
      m.last = { x, y, o, f: m.flip };
      m.el.style.visibility = "visible";
      m.el.style.opacity = String(o);
      m.el.style.pointerEvents = m.collided ? "none" : "";
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)${m.flip ? " scaleX(-1)" : ""}`;
    }
  });

  return null;
}
