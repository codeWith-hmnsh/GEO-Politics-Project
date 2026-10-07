import * as THREE from "three";
import type { Ring } from "@/lib/geo/countries";
import { latLngToVec3 } from "@/lib/geo/sphere";

/** Objects other globe parts need to reach without prop drilling. */
export const globeRefs: { earth: THREE.Mesh | null } = { earth: null };

/** Rings ([lng, lat]) → line-segment positions on a sphere of radius `r`. Skips antimeridian seams. */
export function ringsToSegments(rings: Ring[], r: number): Float32Array {
  const out: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[i + 1];
      if (Math.abs(ax - bx) > 180) continue;
      if (Math.abs(ax) > 179.8 && Math.abs(bx) > 179.8) continue;
      const a = latLngToVec3(ay, ax, r);
      const b = latLngToVec3(by, bx, r);
      out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  return new Float32Array(out);
}

export function segmentsGeometry(rings: Ring[], r: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(ringsToSegments(rings, r), 3));
  return g;
}

/** Sun direction relative to the camera (upper-left), as in the prototype. */
export const SUN_OFFSET = new THREE.Vector3(-2.6, 2.0, 3.0);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
