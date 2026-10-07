"use client";

import { Layers, LocateFixed, Minus, Navigation, Plus } from "lucide-react";
import { homeView, useGlobe } from "@/lib/store";

const round = "grid size-11 place-items-center rounded-full bg-white text-ink shadow-[var(--shadow-card)] hover:bg-paper";

/** Compass, zoom, reset and layers buttons on the right edge (hidden on phones). */
export function MapControls() {
  const panelOpen = useGlobe((s) => s.selectedIso3 !== null);
  const pulseOpen = useGlobe((s) => s.pulseOpen);
  const setPulseOpen = useGlobe((s) => s.setPulseOpen);

  const resetNorth = () => {
    const { camera, flyTo } = useGlobe.getState();
    flyTo({ lat: camera.lat, lng: camera.lng, dist: Math.max(camera.dist, 1.9), durationMs: 700 });
  };

  return (
    <div
      className="fixed top-1/2 z-20 flex -translate-y-[58%] flex-col items-center gap-3 transition-[right] duration-500 max-md:hidden"
      style={{ right: panelOpen ? 440 : 30 }}
    >
      <button type="button" aria-label="Reset north and tilt" onClick={resetNorth} className={round}>
        <Navigation className="size-[18px] fill-current" aria-hidden />
      </button>
      <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
        <button type="button" aria-label="Zoom in" onClick={() => useGlobe.getState().zoomBy(0.72)} className="grid size-11 place-items-center hover:bg-paper">
          <Plus className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => useGlobe.getState().zoomBy(1.35)}
          className="grid size-11 place-items-center border-t border-border hover:bg-paper"
        >
          <Minus className="size-[18px]" aria-hidden />
        </button>
      </div>
      <button type="button" aria-label="Reset view" onClick={() => useGlobe.getState().flyTo(homeView())} className={round}>
        <LocateFixed className="size-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={pulseOpen ? "Hide layers card" : "Show layers card"}
        aria-pressed={pulseOpen}
        onClick={() => setPulseOpen(!pulseOpen)}
        className="grid size-11 place-items-center rounded-xl bg-white shadow-[var(--shadow-card)] hover:bg-paper aria-pressed:bg-[var(--ink-strong)] aria-pressed:text-white"
      >
        <Layers className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}
