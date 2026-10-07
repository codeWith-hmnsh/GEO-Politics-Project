// Camera maths for the Google 3D Maps–style rig (docs/ARCHITECTURE.md §3.4).
import { angleBetween, latLngToVec3, lngDelta } from "@/lib/geo/sphere";

export type CameraState = { lat: number; lng: number; dist: number };

export const CAMERA_LIMITS = { minDist: 1.11, maxDist: 5.5, maxLat: 80 } as const;

const DEG = Math.PI / 180;

/** Tilt toward the horizon as the camera nears the surface: 0 above 1.85 R, up to 52° at 1.2 R. */
export function tiltFor(dist: number): number {
  const k = Math.max(0, Math.min(1, (1.85 - dist) / 0.65));
  return k * 52 * DEG;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Frame-rate independent follow factor for smoothing the camera toward its target. */
export const followFactor = (dt: number, rate = 9) => 1 - Math.exp(-dt * rate);

export type FlyPlan = { from: CameraState; to: CameraState; arc: number; durationMs: number };

/** Plan a parabolic fly-to: travel along the shortest path and rise by `arc` at the midpoint. */
export function planFly(from: CameraState, to: CameraState, durationMs?: number): FlyPlan {
  const angle = angleBetween(latLngToVec3(from.lat, from.lng), latLngToVec3(to.lat, to.lng));
  const arc = Math.max(0.08, Math.min(1.5, angle)) * (to.dist < 1.6 ? 0.6 : 1);
  return {
    from,
    to: { ...to, lng: from.lng + lngDelta(from.lng, to.lng) },
    arc,
    durationMs: durationMs ?? 1200 + angle * 700,
  };
}

/** Camera state at progress `t` (0..1) of a fly plan. */
export function sampleFly(plan: FlyPlan, t: number): CameraState {
  const e = easeInOutCubic(Math.min(1, Math.max(0, t)));
  const { from, to } = plan;
  return {
    lat: from.lat + (to.lat - from.lat) * e,
    lng: from.lng + (to.lng - from.lng) * e,
    dist: from.dist + (to.dist - from.dist) * e + plan.arc * Math.sin(Math.PI * e),
  };
}

export function clampCamera(c: CameraState): CameraState {
  return {
    lat: Math.max(-CAMERA_LIMITS.maxLat, Math.min(CAMERA_LIMITS.maxLat, c.lat)),
    lng: c.lng,
    dist: Math.max(CAMERA_LIMITS.minDist, Math.min(CAMERA_LIMITS.maxDist, c.dist)),
  };
}
