"use client";

import { useNews } from "@/lib/api";
import { useGlobe } from "@/lib/store";
import { Marker } from "./Marker";

/** Diplomacy → Activity: a beacon wherever trusted outlets report visits, talks or summits (PRD §9.7). */
export function ActivityMarkers() {
  const on = useGlobe((s) => s.mode === "diplomacy" && s.diplo.view === "activity" && s.tour === null);
  const { data } = useNews({ section: "diplomacy", limit: 40 });
  if (!on) return null;
  const items = (data?.data ?? []).filter((n) => n.lat !== null && n.lng !== null).slice(0, 12);
  return (
    <div aria-label="Recent diplomacy" className="pointer-events-none fixed inset-0 z-[7]">
      {items.map((n) => (
        <Marker key={n.id} lat={n.lat!} lng={n.lng!} interactive>
          <a
            href={n.url}
            target="_blank"
            rel="noreferrer"
            title={n.title}
            aria-label={`${n.title} (${n.source})`}
            className="pointer-events-auto relative block size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#c25a84] shadow-[0_0_14px_rgba(194,90,132,.8)] before:absolute before:-inset-2 before:animate-ping before:rounded-full before:bg-[#c25a84]/40 motion-reduce:before:hidden"
          />
        </Marker>
      ))}
    </div>
  );
}
