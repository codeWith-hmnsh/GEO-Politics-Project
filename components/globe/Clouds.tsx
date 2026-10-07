"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useGlobe } from "@/lib/store";
import { SUN_OFFSET, prefersReducedMotion } from "./shared";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime, uSpeed, uOff, uOpacity, uShadow;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vec2 uv = vec2(vUv.x + uOff + uTime * uSpeed, vUv.y);
    uv += 0.0035 * vec2(sin(uv.y * 55.0 + uTime * 0.35), cos(uv.x * 42.0 + uTime * 0.28));
    float c = smoothstep(0.1, 0.85, texture2D(map, uv).r);
    float l = clamp(dot(normalize(vN), normalize(uSun)) * 0.75 + 0.45, 0.25, 1.08);
    gl_FragColor = uShadow > 0.5 ? vec4(0.02, 0.05, 0.08, c * uOpacity) : vec4(vec3(l), c * uOpacity);
  }`;

type Shell = { radius: number; speed: number; off: number; opacity: number; shadow?: boolean; order: number };

const SHELLS: Shell[] = [
  { radius: 1.0028, speed: 0.0016, off: 0.0025, opacity: 0.22, shadow: true, order: 1 },
  { radius: 1.011, speed: 0.0016, off: 0, opacity: 0.92, order: 6 },
  { radius: 1.026, speed: 0.0034, off: 0.37, opacity: 0.32, order: 7 },
];

/** "Stratosphere" clouds: two drifting shells for parallax plus a soft ground shadow (UI-DESIGN §4.2). */
export function Clouds({ dimmed = false }: { dimmed?: boolean }) {
  const tex = useTexture("/textures/clouds.jpg");
  const sun = useMemo(() => new THREE.Vector3(), []);
  const [reduce] = useState(prefersReducedMotion);

  useLayoutEffect(() => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
  }, [tex]);

  const materials = useMemo(
    () =>
      SHELLS.map(
        (s) =>
          new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            uniforms: {
              map: { value: tex },
              uTime: { value: 0 },
              uSpeed: { value: s.speed },
              uOff: { value: s.off },
              uOpacity: { value: 0 },
              uShadow: { value: s.shadow ? 1 : 0 },
              uSun: { value: sun },
            },
          }),
      ),
    [tex, sun],
  );

  useFrame(({ clock, camera }, dt) => {
    const dist = useGlobe.getState().camera.dist;
    sun.copy(SUN_OFFSET).applyQuaternion(camera.quaternion).normalize();
    // Clouds thin out as you zoom in and stay faint while data is in focus.
    const zoomFade = Math.max(0.12, Math.min(1, (dist - 1.12) / 0.7));
    const target = dimmed ? 0.35 : 1;
    materials.forEach((m, i) => {
      const s = SHELLS[i];
      m.uniforms.uTime.value = reduce ? 0 : clock.elapsedTime;
      const layerFade = i === 2 ? Math.max(0.05, Math.min(1, (dist - 1.3) / 0.8)) : zoomFade;
      const want = s.opacity * layerFade * target;
      const cur = m.uniforms.uOpacity.value as number;
      m.uniforms.uOpacity.value = cur + (want - cur) * Math.min(1, dt * 3);
    });
  });

  return (
    <>
      {SHELLS.map((s, i) => (
        <mesh key={s.radius} material={materials[i]} renderOrder={s.order} rotation={[i === 2 ? 0.08 : 0, 0, 0]}>
          <sphereGeometry args={[s.radius, 128, 96]} />
        </mesh>
      ))}
    </>
  );
}
