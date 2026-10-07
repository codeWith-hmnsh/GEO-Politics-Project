"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CAMERA_LIMITS, clampCamera, followFactor, planFly, sampleFly, tiltFor, type CameraState, type FlyPlan } from "@/lib/camera/fly";
import { countryAt, type IndexedCountry } from "@/lib/geo/countries";
import { latLngToVec3, lngDelta, vec3ToLatLng } from "@/lib/geo/sphere";
import { homeView, useGlobe } from "@/lib/store";
import { globeRefs, prefersReducedMotion } from "./shared";

const IDLE_MS = 20_000;

/**
 * Google 3D Maps–style camera (docs/ARCHITECTURE.md §3.4): smooth follow, inertia, zoom to cursor,
 * tilt with zoom, parabolic fly-to, idle drift. Also handles hover and click picking.
 */
export function CameraRig({ countries }: { countries: IndexedCountry[] }) {
  const { camera, gl } = useThree();
  const [reduce] = useState(prefersReducedMotion);
  const [home] = useState(homeView);
  const start = reduce ? home : { ...home, dist: home.dist + 3.5 };
  const cam = useRef<CameraState>({ ...start });
  const target = useRef<CameraState>({ ...start });
  const vel = useRef({ lat: 0, lng: 0 });
  const fly = useRef<{ plan: FlyPlan; start: number; onDone?: () => void } | null>(null);
  const lastInput = useRef(0);
  const countriesRef = useRef(countries);
  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

  const startFly = useCallback(
    (to: CameraState, durationMs?: number, onDone?: () => void) => {
      if (reduce) {
        cam.current = { ...to };
        target.current = { ...to };
        onDone?.();
        return;
      }
      fly.current = { plan: planFly({ ...cam.current }, to, durationMs), start: performance.now(), onDone };
      vel.current = { lat: 0, lng: 0 };
    },
    [reduce],
  );

  // Intro flight and external fly requests.
  useEffect(() => {
    lastInput.current = performance.now() - IDLE_MS + 6000;
    startFly(home, 3400, () => useGlobe.getState().finishIntro());
    return useGlobe.subscribe((s, prev) => {
      if (s.fly && s.fly !== prev.fly) {
        startFly({ lat: s.fly.lat, lng: s.fly.lng, dist: s.fly.dist ?? target.current.dist }, s.fly.durationMs);
      }
      if (s.zoom && s.zoom !== prev.zoom) {
        fly.current = null;
        lastInput.current = performance.now();
        const t = target.current;
        t.dist = clampCamera({ ...t, dist: t.dist * s.zoom.factor }).dist;
      }
    });
  }, [startFly, home]);

  // Pointer, wheel and picking on the canvas element.
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch0 = 0;
    let dist0 = 0;
    let lastMove = 0;
    let lastHover = 0;

    const hit = (e: { clientX: number; clientY: number }) => {
      const earth = globeRefs.earth;
      if (!earth) return null;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObject(earth, false)[0];
      return h ? vec3ToLatLng([h.point.x, h.point.y, h.point.z]) : null;
    };
    const touch = () => {
      lastInput.current = performance.now();
      if (fly.current) {
        fly.current = null;
        useGlobe.getState().finishIntro();
      }
    };

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      vel.current = { lat: 0, lng: 0 };
      touch();
      el.style.cursor = "grabbing";
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        dist0 = target.current.dist;
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) {
        const now = performance.now();
        if (now - lastHover < 50 || e.pointerType !== "mouse") return;
        lastHover = now;
        const ll = hit(e);
        const c = ll ? countryAt(countriesRef.current, ll[0], ll[1]) : null;
        useGlobe.getState().setHover(c?.iso3 ?? null, c?.name ?? null, e.clientX, e.clientY, ll);
        el.style.cursor = c ? "pointer" : "grab";
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      touch();
      const t = target.current;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        t.dist = clampCamera({ ...t, dist: (dist0 * pinch0) / Math.hypot(a.x - b.x, a.y - b.y) }).dist;
        return;
      }
      const k = ((t.dist - 1) * 57.3) / (el.clientHeight * 1.1);
      const dLng = (-dx * k) / Math.max(0.3, Math.cos((t.lat * Math.PI) / 180));
      const dLat = dy * k;
      t.lng += dLng;
      t.lat = Math.max(-CAMERA_LIMITS.maxLat, Math.min(CAMERA_LIMITS.maxLat, t.lat + dLat));
      const now = performance.now();
      const dt = Math.max(8, now - lastMove);
      lastMove = now;
      vel.current = { lat: (dLat / dt) * 16, lng: (dLng / dt) * 16 };
    };
    const onUp = (e: PointerEvent) => {
      const had = pointers.delete(e.pointerId);
      el.style.cursor = "grab";
      if (performance.now() - lastMove > 80) vel.current = { lat: 0, lng: 0 };
      if (had && moved < 6 && pointers.size === 0) {
        const ll = hit(e);
        const c = ll ? countryAt(countriesRef.current, ll[0], ll[1]) : null;
        useGlobe.getState().select(c?.iso3 ?? null);
        // A Compare pick frames both countries (ComparePanel), so skip the single-country flight.
        if (c && useGlobe.getState().compareIso3 !== c.iso3) startFly({ lat: c.centroid[0], lng: c.centroid[1], dist: Math.min(Math.max(target.current.dist, 2.6), 3.4) });
      }
    };
    const onCancel = (e: PointerEvent) => pointers.delete(e.pointerId);
    const onLeave = () => useGlobe.getState().setHover(null, null, 0, 0);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      touch();
      const t = target.current;
      const next = clampCamera({ ...t, dist: t.dist * Math.exp(e.deltaY * 0.0013) }).dist;
      const ll = hit(e);
      if (ll && next < t.dist) {
        const f = (1 - next / t.dist) * 0.9;
        t.lat += (ll[0] - t.lat) * f;
        t.lng += lngDelta(t.lng, ll[1]) * f;
      }
      t.dist = next;
    };

    el.style.cursor = "grab";
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
    };
  }, [camera, gl, startFly]);

  const P = useRef(new THREE.Vector3());
  const N = useRef(new THREE.Vector3());
  const north = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    const dt = Math.max(0, Math.min(0.05, rawDt));
    const c = cam.current;
    const t = target.current;
    const now = performance.now();

    if (fly.current) {
      const { plan, start, onDone } = fly.current;
      const p = Math.min(1, (now - start) / plan.durationMs);
      Object.assign(c, sampleFly(plan, p));
      Object.assign(t, c);
      if (p >= 1) {
        fly.current = null;
        onDone?.();
      }
    } else {
      t.lat = Math.max(-CAMERA_LIMITS.maxLat, Math.min(CAMERA_LIMITS.maxLat, t.lat + vel.current.lat));
      t.lng += vel.current.lng;
      const damp = Math.pow(0.9, dt * 60);
      vel.current.lat *= damp;
      vel.current.lng *= damp;
      const st = useGlobe.getState();
      const idle = now - lastInput.current > IDLE_MS && st.selectedIso3 === null && st.tour === null;
      if (!reduce && idle && t.dist > 2.2) t.lng -= dt * 2.2;
      // Story Tour orbit: a slow pan around the current stop.
      if (!reduce && st.orbit) t.lng += st.orbit * dt;
      const k = followFactor(dt);
      c.lat += (t.lat - c.lat) * k;
      c.lng += (t.lng - c.lng) * k;
      c.dist += (t.dist - c.dist) * k;
    }

    // Camera above point P, tilted toward the horizon when close (camera = P + h·(cosθ·N − sinθ·north)).
    P.current.set(...latLngToVec3(c.lat, c.lng));
    north.current
      .set(...latLngToVec3(Math.min(89.9, c.lat + 0.05), c.lng))
      .sub(new THREE.Vector3(...latLngToVec3(Math.max(-89.9, c.lat - 0.05), c.lng)))
      .normalize();
    const h = c.dist - 1;
    const th = tiltFor(c.dist);
    N.current.copy(P.current).normalize();
    camera.position
      .copy(P.current)
      .addScaledVector(N.current, h * Math.cos(th))
      .addScaledVector(north.current, -h * Math.sin(th));
    camera.up.copy(north.current);
    camera.lookAt(P.current);
    const persp = camera as THREE.PerspectiveCamera;
    persp.near = Math.max(0.002, h * 0.25);
    persp.updateProjectionMatrix();

    const live = useGlobe.getState().camera;
    live.lat = c.lat;
    live.lng = c.lng;
    live.dist = c.dist;
  });

  return null;
}
