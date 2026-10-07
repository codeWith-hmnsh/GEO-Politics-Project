"use client";

import { useMemo } from "react";
import { useCountryFacts } from "@/lib/api";
import type { IndexedCountry } from "@/lib/geo/countries";
import { CRUDE_COLOR } from "@/components/chrome/EnergySections";
import { arcBudget } from "@/lib/perf";
import { useGlobe } from "@/lib/store";
import { RelationArc } from "./RelationsLayer";

export const TRADE_COLORS = { exports: "#f2b33d", imports: "#35b6c4", creditors: "#c25a84" } as const;

/** Economy: arcs to the selected country's top export and import partners and from its lending countries (PRD §9.4). */
export function TradeLayer({ countries }: { countries: IndexedCountry[] }) {
  const mode = useGlobe((s) => s.mode);
  const selected = useGlobe((s) => (s.mode === "economy" || s.mode === "energy" ? s.selectedIso3 : null));
  const { data } = useCountryFacts(selected);
  const tier = useGlobe((s) => s.tier);
  const arcs = useMemo(() => {
    if (!selected || !data) return [];
    const byIso = new Map(countries.map((c) => [c.iso3, c]));
    const origin = byIso.get(selected);
    if (!origin) return [];
    // Energy: crude oil flows from the top suppliers to the selected country.
    if (mode === "energy") {
      return (data.data.crude?.suppliers ?? [])
        .filter((p) => byIso.has(p.iso3))
        .map((p) => ({ key: `o-${p.iso3}`, from: byIso.get(p.iso3)!.centroid, to: origin.centroid, color: CRUDE_COLOR }));
    }
    const trade = data.data.trade;
    const out = (trade?.exports ?? [])
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `x-${p.iso3}`, from: origin.centroid, to: byIso.get(p.iso3)!.centroid, color: TRADE_COLORS.exports }));
    const inn = (trade?.imports ?? [])
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `m-${p.iso3}`, from: byIso.get(p.iso3)!.centroid, to: origin.centroid, color: TRADE_COLORS.imports }));
    // Lending countries: arcs from creditor to borrower (institutions and bondholders have no place on the map).
    const lent = (data.data.creditors?.creditors ?? [])
      .filter((c) => c.iso3 && byIso.has(c.iso3) && c.iso3 !== selected)
      .map((c) => ({ key: `d-${c.iso3}`, from: byIso.get(c.iso3!)!.centroid, to: origin.centroid, color: TRADE_COLORS.creditors }));
    return [...out, ...inn, ...lent];
  }, [selected, data, countries, mode]);
  return (
    <>
      {arcs.slice(0, arcBudget(arcs.length, tier)).map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={a.color} index={i} />
      ))}
    </>
  );
}
