"use client";

import { useEffect, useState } from "react";
import nuclear from "@/data/curated/nuclear.json";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { Marker } from "./Marker";

/** Defense → Nuclear chip: ☢ on the nine nuclear-armed states, a ring on NATO sharing hosts (PRD §9.5). */
export function NuclearMarkers() {
  const visible = useGlobe((s) => s.mode === "defense" && s.modeMetric.defense === "nuclear");
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);
  if (!visible || !countries.length) return null;
  const at = (iso3: string) => countries.find((c) => c.iso3 === iso3);
  return (
    <div aria-label="Nuclear-armed states" className="pointer-events-none fixed inset-0 z-[7]">
      {nuclear.items.map((n) => {
        const c = at(n.iso3);
        if (!c) return null;
        return (
          <Marker key={n.iso3} lat={c.centroid[0]} lng={c.centroid[1]} interactive>
            <button
              type="button"
              aria-label={`${c.name}: about ${n.warheads.toLocaleString("en-US")} nuclear warheads (estimate)`}
              onClick={() => useGlobe.getState().select(n.iso3)}
              className="pointer-events-auto grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#1b2f7a] text-[17px] leading-none text-[#ffd84d] shadow-[0_4px_12px_rgba(0,0,0,.4)]"
            >
              ☢
            </button>
          </Marker>
        );
      })}
      {nuclear.sharingHosts.map((iso3) => {
        const c = at(iso3);
        if (!c) return null;
        return (
          <Marker key={iso3} lat={c.centroid[0]} lng={c.centroid[1]}>
            <span
              title={`${c.name}: ${nuclear.sharingNote}`}
              className="block size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#ffd84d] shadow-[0_0_10px_rgba(255,216,77,.6)]"
            />
          </Marker>
        );
      })}
    </div>
  );
}
