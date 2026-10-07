"use client";

import dynamic from "next/dynamic";
import { useGlobe } from "@/lib/store";
import { ConflictMarkers } from "./ConflictMarkers";
import { HomeMarkers } from "./HomeMarkers";
import { MapLabels } from "./MapLabels";
import { RelationsAnchor } from "./RelationsAnchor";

// WebGL only runs in the browser; keep the globe out of server prerendering.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

function HoverTooltip() {
  const name = useGlobe((s) => s.hoverName);
  const { x, y } = useGlobe((s) => s.pointer);
  if (!name) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-lg bg-[var(--night)] px-2.5 py-1.5 text-xs font-semibold text-white"
      style={{ left: x + 14, top: y + 16 }}
    >
      {name}
    </div>
  );
}

export function GlobeClient() {
  return (
    <>
      <GlobeCanvas />
      <MapLabels />
      <HomeMarkers />
      <ConflictMarkers />
      <RelationsAnchor />
      <HoverTooltip />
    </>
  );
}
