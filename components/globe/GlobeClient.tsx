"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePulse } from "@/lib/api";
import { pointInRing } from "@/lib/geo/sphere";
import { REL_LABEL, relationsFor } from "@/lib/relations";
import { useGlobe } from "@/lib/store";
import { ConflictMarkers } from "./ConflictMarkers";
import { Fallback2D } from "./Fallback2D";
import { HomeMarkers } from "./HomeMarkers";
import { MapLabels } from "./MapLabels";
import { ActivityMarkers } from "./ActivityMarkers";
import { ChokepointMarkers } from "./ChokepointMarkers";
import { NuclearMarkers } from "./NuclearMarkers";
import { RelationsAnchor } from "./RelationsAnchor";

// WebGL only runs in the browser; keep the globe out of server prerendering.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

function HoverTooltip() {
  const name = useGlobe((s) => s.hoverName);
  const iso3 = useGlobe((s) => s.hoverIso3);
  const ll = useGlobe((s) => s.hoverLatLng);
  const selected = useGlobe((s) => (s.mode === "home" ? s.selectedIso3 : null));
  const { x, y } = useGlobe((s) => s.pointer);
  const { data } = usePulse();
  if (!name) return null;
  const disputed =
    ll
      ? data?.data.borders.disputed.find((d) => pointInRing(ll[1], ll[0], (d.polygon as [number, number][]).map(([lat, lng]) => [lng, lat])))
      : undefined;
  const rel =
    selected && iso3 && iso3 !== selected && data
      ? relationsFor(selected, data.data.relations, data.data.organizations).get(iso3)
      : undefined;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-lg bg-[var(--night)] px-2.5 py-1.5 text-xs font-semibold text-white"
      style={{ left: x + 14, top: y + 16 }}
    >
      {name}
      {selected && iso3 !== selected && <> · {REL_LABEL[rel?.status ?? "neutral"]}</>}
      {disputed && <span className="mt-1 block max-w-[260px] font-normal text-white/80">Disputed: {disputed.claimants}</span>}
    </div>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function GlobeClient() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWebgl(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);
  if (webgl === false) return <Fallback2D />;
  return (
    <>
      <GlobeCanvas />
      <MapLabels />
      <HomeMarkers />
      <ConflictMarkers />
      <RelationsAnchor />
      <NuclearMarkers />
      <ChokepointMarkers />
      <ActivityMarkers />
      <HoverTooltip />
    </>
  );
}
