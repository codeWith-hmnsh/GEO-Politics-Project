"use client";

import chokepoints from "@/data/curated/chokepoints.json";
import { useGlobe } from "@/lib/store";
import { Marker } from "./Marker";

/** Energy mode: fixed amber markers on the six oil and gas chokepoints (PRD §9.6). */
export function ChokepointMarkers() {
  const visible = useGlobe((s) => s.mode === "energy" && s.tour === null);
  if (!visible) return null;
  return (
    <div aria-label="Chokepoints" className="pointer-events-none fixed inset-0 z-[7]">
      {chokepoints.items.map((c) => (
        <Marker key={c.id} lat={c.at[0]} lng={c.at[1]} interactive>
          <button
            type="button"
            aria-label={`${c.name}: open details`}
            onClick={() => {
              const s = useGlobe.getState();
              s.selectChoke(c.id);
              s.flyTo({ lat: c.at[0], lng: c.at[1], dist: 2.2 });
            }}
            className="pointer-events-auto flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-white bg-mixed py-1 pr-2.5 pl-1 text-xs font-bold whitespace-nowrap text-white shadow-[0_4px_12px_rgba(0,0,0,.35)]"
          >
            <span className="grid size-5 place-items-center rounded-full bg-white/25" aria-hidden>
              ◆
            </span>
            {c.name}
          </button>
        </Marker>
      ))}
    </div>
  );
}
