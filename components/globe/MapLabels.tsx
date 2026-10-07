"use client";

import { useEffect, useState } from "react";
import places from "@/data/curated/places.json";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { Marker } from "./Marker";

const BIG = new Set(["RUS", "CHN", "IND", "USA", "CAN", "BRA", "AUS"]);
const shadow = "[text-shadow:0_1px_4px_rgba(0,0,0,.75)]";
const center = "-translate-x-1/2 -translate-y-1/2 whitespace-nowrap";

/** Country, sea, city and state labels that appear as the camera zooms in (UI-DESIGN §4.4). */
export function MapLabels() {
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  const adminLabels = useGlobe((s) => s.adminLabels);

  useEffect(() => {
    let alive = true;
    loadCountries().then((list) => alive && setCountries(list.filter((c) => !BIG.has(c.iso3) && c.area > 40)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {places.bigCountryLabels.map((l) => (
        <Marker key={l.text} lat={l.lat} lng={l.lng} maxDist={3.6}>
          <span className={`${center} ${shadow} block font-display text-[13px] tracking-[.3em] text-white/95`}>{l.text}</span>
        </Marker>
      ))}
      {countries.map((c) => (
        <Marker key={c.iso3} lat={c.centroid[0]} lng={c.centroid[1]} maxDist={2.15}>
          <span className={`${center} ${shadow} block font-display text-[10.5px] tracking-[.22em] text-white/95`}>
            {c.name.toUpperCase()}
          </span>
        </Marker>
      ))}
      {places.seas.map((l) => (
        <Marker key={l.text} lat={l.lat} lng={l.lng} maxDist={"maxDist" in l ? l.maxDist : undefined}>
          <span className={`${center} ${shadow} block font-display text-sm italic tracking-[.2em] text-[#e1f0fa]/90`}>
            {l.text}
          </span>
        </Marker>
      ))}
      {places.cities.map(([name, lat, lng]) => (
        <Marker key={name as string} lat={lat as number} lng={lng as number} maxDist={1.75}>
          <span className={`${shadow} relative -translate-y-1/2 translate-x-2 block whitespace-nowrap text-[11px] font-semibold text-white`}>
            <i className="absolute -left-2 top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-[#ffd27a] shadow-[0_0_6px_#ffb020]" />
            {name}
          </span>
        </Marker>
      ))}
      {Object.entries(adminLabels).flatMap(([iso3, labels]) =>
        labels.map((s) => (
          <Marker key={`${iso3}-${s.name}`} lat={s.label[0]} lng={s.label[1]} maxDist={1.62}>
            <span className={`${center} block text-[10px] font-semibold tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,.9)]`}>
              {s.name}
            </span>
          </Marker>
        )),
      )}
    </div>
  );
}
