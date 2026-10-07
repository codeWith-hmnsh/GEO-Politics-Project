// Sphere maths shared by the globe, markers and camera (ported from all_refrence-ui/prototype-v3).
// Convention matches three.js SphereGeometry UVs: lng -180 at -X, lng -90 at +Z, north pole at +Y.

export type Vec3 = [number, number, number];
export type LatLng = [lat: number, lng: number];

const DEG = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, radius = 1): Vec3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

export function vec3ToLatLng([x, y, z]: Vec3): LatLng {
  const r = Math.hypot(x, y, z);
  const lat = 90 - Math.acos(y / r) / DEG;
  let lng = Math.atan2(z, -x) / DEG - 180;
  if (lng < -180) lng += 360;
  return [lat, lng];
}

export function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = Math.hypot(...a) * Math.hypot(...b);
  return Math.acos(Math.min(1, Math.max(-1, dot / len)));
}

/** Spherical linear interpolation between two vectors of equal length. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const omega = angleBetween(a, b);
  if (omega < 1e-6) return [...a];
  const s = Math.sin(omega);
  const ka = Math.sin((1 - t) * omega) / s;
  const kb = Math.sin(t * omega) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

/** Shortest signed longitude difference from `from` to `to`, in (-180, 180]. */
export function lngDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Point-in-polygon on a [lng, lat] ring (ray casting). */
export function pointInRing(lng: number, lat: number, ring: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
