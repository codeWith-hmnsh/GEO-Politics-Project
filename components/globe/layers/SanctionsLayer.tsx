"use client";

import { useMemo } from "react";
import sanctions from "@/data/curated/sanctions.json";
import { issuerPoint } from "@/lib/diplomacy";
import type { IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { RelationArc } from "./RelationsLayer";

export const SANCTION_COLOR = "#c25a84";

/** Diplomacy → Sanctions: arcs from each issuer to the sanctioned country; with a country selected, only its rows. */
export function SanctionsLayer({ countries }: { countries: IndexedCountry[] }) {
  const on = useGlobe((s) => s.mode === "diplomacy" && s.diplo.view === "sanctions");
  const selected = useGlobe((s) => s.selectedIso3);
  const arcs = useMemo(() => {
    if (!on) return [];
    const byIso = new Map(countries.map((c) => [c.iso3, c.centroid]));
    const centroid = (iso3: string) => byIso.get(iso3);
    return sanctions.items
      .filter((r) => !selected || r.target === selected || r.by.includes(selected))
      .flatMap((r) => {
        const to = centroid(r.target);
        if (!to) return [];
        return r.by.flatMap((id) => {
          const from = issuerPoint(id, centroid);
          return from ? [{ key: `${id}-${r.target}`, from, to }] : [];
        });
      });
  }, [on, selected, countries]);
  return (
    <>
      {arcs.map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={SANCTION_COLOR} index={i} />
      ))}
    </>
  );
}
