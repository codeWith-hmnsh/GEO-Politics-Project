"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { HEADER_SAFE_Y, markerRegistry } from "@/lib/markers";
import { useGlobe } from "@/lib/store";

/** Projects registered DOM markers onto the screen each frame and hides those behind the globe. */
export function MarkerProjector() {
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), n: new THREE.Vector3(), toCam: new THREE.Vector3() }), []);

  useFrame(({ camera, size }) => {
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
      const o = Math.min(1, (facing - 0.12) * 5);
      if (m.last && m.last.f === m.flip && Math.abs(m.last.x - x) < 0.1 && Math.abs(m.last.y - y) < 0.1 && Math.abs(m.last.o - o) < 0.01) continue;
      m.last = { x, y, o, f: m.flip };
      m.el.style.visibility = "visible";
      m.el.style.opacity = String(o);
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)${m.flip ? " scaleX(-1)" : ""}`;
    }
  });

  return null;
}
