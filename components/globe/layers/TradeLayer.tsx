"use client";

import { useMemo } from "react";
import { useCountryFacts } from "@/lib/api";
import type { IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { RelationArc } from "./RelationsLayer";

export const TRADE_COLORS = { exports: "#f2b33d", imports: "#35b6c4" } as const;

/** Economy: arcs from the selected country to its top export and import partners (PRD §9.4). */
export function TradeLayer({ countries }: { countries: IndexedCountry[] }) {
  const selected = useGlobe((s) => (s.mode === "economy" ? s.selectedIso3 : null));
  const { data } = useCountryFacts(selected);
  const arcs = useMemo(() => {
    const trade = data?.data.trade;
    if (!selected || !trade) return [];
    const byIso = new Map(countries.map((c) => [c.iso3, c]));
    const origin = byIso.get(selected);
    if (!origin) return [];
    const out = trade.exports
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `x-${p.iso3}`, from: origin.centroid, to: byIso.get(p.iso3)!.centroid, color: TRADE_COLORS.exports }));
    const inn = trade.imports
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `m-${p.iso3}`, from: byIso.get(p.iso3)!.centroid, to: origin.centroid, color: TRADE_COLORS.imports }));
    return [...out, ...inn];
  }, [selected, data, countries]);
  return (
    <>
      {arcs.map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={a.color} index={i} />
      ))}
    </>
  );
}
