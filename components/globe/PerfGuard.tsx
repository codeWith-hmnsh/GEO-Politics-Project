"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { detectTier, tierOverride } from "@/lib/perf";
import { useGlobe } from "@/lib/store";

const SAMPLE_MS = 4000;
const MIN_FPS = 22;

/**
 * Picks the device tier once (detect-gpu), then watches the first seconds after the intro:
 * if the full globe still runs below ~22 fps, it switches to the light globe for this visit.
 */
export function PerfGuard() {
  const sample = useRef<{ start: number; frames: number } | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    // A forced tier (?tier=…) or Data Saver is final; only detected tiers are re-checked by frame rate.
    if (tierOverride()) done.current = true;
    detectTier().then((t) => alive && useGlobe.getState().setTier(t));
    return () => {
      alive = false;
    };
  }, []);

  useFrame(() => {
    if (done.current) return;
    const s = useGlobe.getState();
    if (!s.introDone || s.tier === 1) return;
    const now = performance.now();
    sample.current ??= { start: now, frames: 0 };
    sample.current.frames++;
    const elapsed = now - sample.current.start;
    if (elapsed < SAMPLE_MS) return;
    done.current = true;
    const fps = (sample.current.frames * 1000) / elapsed;
    if (fps < MIN_FPS) s.setTier(1);
  });

  return null;
}

/** Development-only frame-rate readout (BUILD-PLAN M1.1). */
export function FpsMeter() {
  const [fps, setFps] = useState(0);
  const tier = useGlobe((s) => s.tier);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let id = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed bottom-2 left-1/2 z-50 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] text-white">
      {fps} fps · tier {tier}
    </div>
  );
}
