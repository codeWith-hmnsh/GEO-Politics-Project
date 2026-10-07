"use client";

import { useEffect, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { usePulse } from "@/lib/api";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { relationsFor } from "@/lib/relations";
import { useGlobe } from "@/lib/store";
import { Marker } from "./Marker";

const OFFSET: [number, number] = [52, -28];

/** Dark quick-facts card beside the selected country, joined by a dashed line (UI-DESIGN §6). */
export function RelationsAnchor() {
  const iso3 = useGlobe((s) => (s.mode === "home" ? s.selectedIso3 : null));
  const { data } = usePulse();
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const country = countries.find((c) => c.iso3 === iso3);
  if (!country || !data) return null;
  const rows = [...relationsFor(country.iso3, data.data.relations, data.data.organizations).values()];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const blocs = data.data.organizations.filter((o) => o.members.includes(country.iso3)).length;
  const facts: [string, number, string][] = [
    ["Allies / partners", count("ally"), "#7ee0ae"],
    ["Hostile", count("hostile"), "#ff8a8e"],
    ["Mixed", count("mixed"), "#ffc966"],
    ["Blocs", blocs, "#ffffff"],
  ];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[8] max-md:hidden">
      <Marker key={country.iso3} lat={country.centroid[0]} lng={country.centroid[1]} offset={OFFSET}>
        <div className="relative min-w-[216px] rounded-xl border border-white/30 bg-[var(--night)] px-4 py-3.5 text-white shadow-[0_14px_40px_rgba(0,0,0,.35)] before:absolute before:top-[26px] before:-left-[46px] before:w-[46px] before:border-t-[1.5px] before:border-dashed before:border-white/85">
          <div className="mb-2.5 flex items-center gap-2.5 text-[17px] font-bold">
            <Flag iso3={country.iso3} className="h-4 w-6" />
            {country.name}
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-[18px] gap-y-1.5 text-[13px]">
            {facts.map(([label, value, color]) => (
              <div key={label} className="contents">
                <dt className="text-white/75">{label}</dt>
                <dd className="text-right font-bold tabular-nums" style={{ color }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Marker>
    </div>
  );
}
