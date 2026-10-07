"use client";

import { useMemo } from "react";
import { useCountryFacts } from "@/lib/api";
import type { IndexedCountry } from "@/lib/geo/countries";
import { useGlobe } from "@/lib/store";
import { RelationArc } from "./RelationsLayer";

export const TRADE_COLORS = { exports: "#f2b33d", imports: "#35b6c4", creditors: "#c25a84" } as const;

/** Economy: arcs to the selected country's top export and import partners and from its lending countries (PRD §9.4). */
export function TradeLayer({ countries }: { countries: IndexedCountry[] }) {
  const selected = useGlobe((s) => (s.mode === "economy" ? s.selectedIso3 : null));
  const { data } = useCountryFacts(selected);
  const arcs = useMemo(() => {
    const trade = data?.data.trade;
    if (!selected || (!trade && !data?.data.creditors)) return [];
    const byIso = new Map(countries.map((c) => [c.iso3, c]));
    const origin = byIso.get(selected);
    if (!origin) return [];
    const out = (trade?.exports ?? [])
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `x-${p.iso3}`, from: origin.centroid, to: byIso.get(p.iso3)!.centroid, color: TRADE_COLORS.exports }));
    const inn = (trade?.imports ?? [])
      .filter((p) => byIso.has(p.iso3))
      .map((p) => ({ key: `m-${p.iso3}`, from: byIso.get(p.iso3)!.centroid, to: origin.centroid, color: TRADE_COLORS.imports }));
    // Lending countries: arcs from creditor to borrower (institutions and bondholders have no place on the map).
    const lent = (data?.data.creditors?.creditors ?? [])
      .filter((c) => c.iso3 && byIso.has(c.iso3) && c.iso3 !== selected)
      .map((c) => ({ key: `d-${c.iso3}`, from: byIso.get(c.iso3!)!.centroid, to: origin.centroid, color: TRADE_COLORS.creditors }));
    return [...out, ...inn, ...lent];
  }, [selected, data, countries]);
  return (
    <>
      {arcs.map((a, i) => (
        <RelationArc key={a.key} from={a.from} to={a.to} color={a.color} index={i} />
      ))}
    </>
  );
}
