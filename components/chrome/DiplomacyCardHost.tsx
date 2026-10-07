"use client";

import { useEffect, useState } from "react";
import { loadCountries, type IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { DiplomacyCard } from "./DiplomacyCard";

/** Mounts the Diplomacy card with a country-name lookup once geometry has loaded. */
export function DiplomacyCardHost() {
  const on = useGlobe((s) => s.mode === "diplomacy");
  const [countries, setCountries] = useState<IndexedCountry[]>([]);
  useEffect(() => {
    if (on && !countries.length) loadCountries().then(setCountries).catch(() => setCountries([]));
  }, [on, countries.length]);
  if (!on) return null;
  const name = (iso3: string) => countries.find((c) => c.iso3 === iso3)?.name ?? iso3;
  return <DiplomacyCard countryName={name} />;
}
