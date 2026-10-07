// Shared visual effects for globe layers, ported from all_refrence-ui/prototype-v3.
import * as THREE from "three";
import { latLngToVec3, slerp } from "@/lib/geo/sphere";

let glow: THREE.CanvasTexture | null = null;
let ring: THREE.CanvasTexture | null = null;

/** Soft radial glow used for conflict hotspots and arc heads. */
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.18, "rgba(255,255,255,.75)");
  gr.addColorStop(0.45, "rgba(255,255,255,.22)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glow = new THREE.CanvasTexture(c);
  return glow;
}

/** Thin ring used for pulses and impacts. */
export function ringTexture() {
  if (ring) return ring;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#fff";
  g.lineWidth = 7;
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.stroke();
  ring = new THREE.CanvasTexture(c);
  return ring;
}

const v3 = (lat: number, lng: number, r = 1) => new THREE.Vector3(...latLngToVec3(lat, lng, r));

/** Great-circle arc lifted above the surface; height grows with distance. */
export function arcCurve(from: [number, number], to: [number, number], opts: { lift?: number; base?: number } = {}) {
  const a = latLngToVec3(from[0], from[1]);
  const b = latLngToVec3(to[0], to[1]);
  const angle = new THREE.Vector3(...a).angleTo(new THREE.Vector3(...b));
  const h = opts.lift ?? Math.min(0.38, 0.03 + angle * 0.3);
  const n = Math.max(24, Math.round(angle * 90));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = slerp(a, b, t);
    pts.push(new THREE.Vector3(...p).multiplyScalar((opts.base ?? 1.004) + h * Math.sin(Math.PI * t)));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** A line hugging the surface through the given [lat, lng] points. */
export function surfaceCurve(points: [number, number][], r = 1.0035) {
  return new THREE.CatmullRomCurve3(points.map(([lat, lng]) => v3(lat, lng, r)));
}

export type ArcLook = {
  color: THREE.ColorRepresentation;
  period?: number;
  offset?: number;
  trail?: number;
  base?: number;
  dash?: boolean;
  dashCount?: number;
  speed?: number;
  additive?: boolean;
};

/**
 * Tube shader: a bright head runs along the tube (vUv.x) leaving a fading trail, over a faint base line.
 * With `dash`, it draws moving dashes instead (trade routes, front lines).
 */
export function arcMaterial(look: ArcLook) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: look.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uColor: { value: new THREE.Color(look.color) },
      uTime: { value: 0 },
      uPeriod: { value: look.period ?? 2.6 },
      uOff: { value: look.offset ?? 0 },
      uTrail: { value: look.trail ?? 0.35 },
      uBase: { value: look.base ?? 0.16 },
      uFade: { value: 1 },
      uDash: { value: look.dash ? 1 : 0 },
      uDashN: { value: look.dashCount ?? 60 },
      uSpeed: { value: look.speed ?? 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime, uPeriod, uOff, uTrail, uBase, uFade, uDash, uDashN, uSpeed;
      varying vec2 vUv;
      void main() {
        float x = vUv.x; vec3 col = uColor; float a;
        if (uDash > 0.5) {
          a = step(0.45, fract(x * uDashN - uTime * uSpeed)) * uBase;
        } else {
          float head = fract((uTime + uOff) / uPeriod) * 1.3;
          float d = head - x;
          float t = (d > 0.0 && d < uTrail) ? pow(1.0 - d / uTrail, 1.8) : 0.0;
          a = max(uBase, t);
          col = mix(uColor, vec3(1.0, 0.96, 0.9), t * t * 0.7);
        }
        gl_FragColor = vec4(col, a * uFade);
      }`,
  });
}

/** Where the arc head is at time `t` (0..1 along the curve), or > 1 during the impact phase. */
export const headProgress = (t: number, period: number, offset: number) => Math.max(0, (((t + offset) / period) % 1) * 1.3);
