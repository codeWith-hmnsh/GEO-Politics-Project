"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { SUN_OFFSET, globeRefs } from "./shared";

const TEX = {
  map: "/textures/earth-blue-marble.jpg",
  bump: "/textures/earth-topology.jpg",
  water: "/textures/earth-water.jpg",
  night: "/textures/earth-night-2k.jpg",
};

/** Satellite Earth: Blue Marble, relief, water glint and warm city lights (UI-DESIGN §4.1). */
export function Earth({ segments = 200 }: { segments?: number }) {
  const [map, bump, water, night] = useTexture([TEX.map, TEX.bump, TEX.water, TEX.night]);
  const { gl, camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    for (const t of [map, night]) t.colorSpace = THREE.SRGBColorSpace;
    for (const t of [map, bump, water, night]) {
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }
    globeRefs.earth = mesh.current;
    return () => {
      globeRefs.earth = null;
    };
  }, [gl, map, bump, water, night]);

  // Keep the sun at the camera's upper-left so the visible side is always lit.
  useFrame(() => {
    if (!light.current) return;
    light.current.position.copy(SUN_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
  });

  return (
    <>
      <ambientLight intensity={0.34} />
      <directionalLight ref={light} intensity={1.08} color="#fff6ea" />
      <mesh ref={mesh}>
        <sphereGeometry args={[1, segments, Math.round(segments * 0.7)]} />
        <meshPhongMaterial
          map={map}
          bumpMap={bump}
          bumpScale={0.012}
          specularMap={water}
          specular="#3a5a78"
          shininess={18}
          emissiveMap={night}
          emissive="#ffc87a"
          emissiveIntensity={0.55}
        />
      </mesh>
    </>
  );
}
