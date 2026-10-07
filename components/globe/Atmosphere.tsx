"use client";

import { useMemo } from "react";
import * as THREE from "three";

const halo = {
  vertexShader: /* glsl */ `
    varying vec3 vN;
    void main() {
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vN;
    void main() {
      float i = pow(max(0.0, 0.76 - dot(vN, vec3(0.0, 0.0, 1.0))), 2.2);
      gl_FragColor = vec4(0.72, 0.86, 1.0, clamp(i * 1.7, 0.0, 1.0));
    }`,
};

const rim = {
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.4);
      gl_FragColor = vec4(0.75, 0.88, 1.0, f * 0.9);
    }`,
};

/** Soft blue halo behind the globe plus a haze on the limb. */
export function Atmosphere() {
  const haloMat = useMemo(
    () => new THREE.ShaderMaterial({ ...halo, side: THREE.BackSide, transparent: true, depthWrite: false }),
    [],
  );
  const rimMat = useMemo(() => new THREE.ShaderMaterial({ ...rim, transparent: true, depthWrite: false }), []);
  return (
    <>
      <mesh scale={1.085} material={haloMat}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      <mesh material={rimMat} renderOrder={8}>
        <sphereGeometry args={[1.03, 96, 72]} />
      </mesh>
    </>
  );
}
