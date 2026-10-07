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
        m.el.style.opacity = "0";
        m.el.style.visibility = "hidden";
        continue;
      }
      tmp.p.project(camera);
      const x = ((tmp.p.x + 1) / 2) * size.width + (m.offset?.[0] ?? 0);
      const y = ((1 - tmp.p.y) / 2) * size.height + (m.offset?.[1] ?? 0);
      if (y < HEADER_SAFE_Y) {
        m.el.style.opacity = "0";
        m.el.style.visibility = "hidden";
        continue;
      }
      m.el.style.visibility = "visible";
      m.el.style.opacity = String(Math.min(1, (facing - 0.12) * 5));
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  });

  return null;
}
