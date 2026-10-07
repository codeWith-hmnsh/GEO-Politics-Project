// Trade lanes shared by the 3D routes and the DOM ships.
import * as THREE from "three";
import lanesData from "@/data/curated/lanes.json";
import { latLngToVec3, slerp } from "@/lib/geo/sphere";

export const LANES = lanesData.lanes;

let curves: THREE.CatmullRomCurve3[] | null = null;

/** Lanes as smooth curves just above the surface (slerped between waypoints). */
export function laneCurves(): THREE.CatmullRomCurve3[] {
  if (curves) return curves;
  curves = LANES.map((lane) => {
    const pts: THREE.Vector3[] = [];
    const wp = lane.points as [number, number][];
    for (let i = 0; i < wp.length - 1; i++) {
      const a = latLngToVec3(wp[i][0], wp[i][1]);
      const b = latLngToVec3(wp[i + 1][0], wp[i + 1][1]);
      const seg = Math.max(4, Math.round(new THREE.Vector3(...a).angleTo(new THREE.Vector3(...b)) * 60));
      for (let k = 0; k < seg; k++) pts.push(new THREE.Vector3(...slerp(a, b, k / seg)).multiplyScalar(1.0035));
    }
    const last = wp[wp.length - 1];
    pts.push(new THREE.Vector3(...latLngToVec3(last[0], last[1], 1.0035)));
    return new THREE.CatmullRomCurve3(pts);
  });
  return curves;
}

/** Ship id → lane and progress; DOM ships register here, the economy layer moves them. */
export const ships = new Map<string, { lane: number; t: number; speed: number }>();
