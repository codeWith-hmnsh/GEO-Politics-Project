"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { markerRegistry } from "@/lib/markers";
import { arcMaterial } from "../fx";
import { laneCurves, ships } from "../lanes";
import { prefersReducedMotion } from "../shared";
import { useHomeLayerVisible } from "./WarsLayer";

/** Home layer 3 (UI-DESIGN §4.3): golden dashed trade routes; also moves the DOM ships along them. */
export function EconomyLayer() {
  const visible = useHomeLayerVisible("econ");
  const [reduce] = useState(prefersReducedMotion);
  const fade = useRef(0);
  const group = useRef<THREE.Group>(null);
  const curves = useMemo(() => laneCurves(), []);
  const meshes = useMemo(
    () =>
      curves.map((c) => ({
        geometry: new THREE.TubeGeometry(c, Math.round(c.points.length * 1.5), 0.0016, 5, false),
        material: arcMaterial({ color: "#f6c453", dash: true, dashCount: Math.round(c.getLength() * 95), speed: 0.6, base: 0.95 }),
      })),
    [curves],
  );
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3() }), []);

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    fade.current += ((visible ? 1 : 0) - fade.current) * Math.min(1, dt / 0.18);
    if (group.current) group.current.visible = fade.current > 0.01;
    for (const m of meshes) {
      m.material.uniforms.uTime.value = reduce ? 0 : clock.elapsedTime;
      m.material.uniforms.uFade.value = fade.current;
    }
    for (const [id, s] of ships) {
      const entry = markerRegistry.get(id);
      const curve = curves[s.lane];
      if (!entry || !curve) continue;
      if (!reduce) s.t = (s.t + dt * s.speed) % 1;
      const p = curve.getPointAt(s.t, tmp.a);
      entry.v = [p.x, p.y, p.z];
      // Face the direction of travel on screen.
      const ahead = curve.getPointAt(Math.min(1, s.t + 0.002), tmp.b);
      const sx = p.clone().project(camera).x;
      entry.flip = ahead.project(camera).x < sx;
    }
  });

  return (
    <group ref={group}>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} renderOrder={4} />
      ))}
    </group>
  );
}
