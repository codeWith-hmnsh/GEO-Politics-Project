"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { Object3D } from "three";
import { useGlobe } from "@/lib/store";

/**
 * Layers start hidden and compile their shaders the first time they show, which stalls a frame right when the
 * mode changes (worst on Windows, where shader compiles are slow). Once the intro is done, compile every hidden
 * layer up front, in the background.
 */
export function Precompile({ ready }: { ready: boolean }) {
  const { gl, scene, camera } = useThree();
  const introDone = useGlobe((s) => s.introDone);
  useEffect(() => {
    if (!ready || !introDone) return;
    const id = setTimeout(() => {
      // compile only walks visible objects, so show the hidden ones for the length of this call
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      gl.compileAsync(scene, camera).catch(() => {});
      for (const o of hidden) o.visible = false;
    }, 800);
    return () => clearTimeout(id);
  }, [ready, introDone, gl, scene, camera]);
  return null;
}
