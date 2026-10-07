// Diplomacy mode helpers (docs/PRD.md §9.7): sanctions, UN voting alignment and the view chips.
import sanctions from "@/data/curated/sanctions.json";

export const DIPLO_VIEWS = [
  { id: "blocs", label: "Blocs" },
  { id: "unvotes", label: "UN votes" },
  { id: "sanctions", label: "Sanctions" },
  { id: "activity", label: "Activity" },
  { id: "relations", label: "Relations" },
] as const;
export type DiploView = (typeof DIPLO_VIEWS)[number]["id"];

export type SanctionRow = (typeof sanctions.items)[number];
type Issuer = { name: string; at?: number[] };
export const ISSUERS = sanctions.issuers as Record<string, Issuer>;

/** Where an issuer's arcs start: its own point (UN, EU) or the country's centroid. */
export function issuerPoint(id: string, centroid: (iso3: string) => [number, number] | undefined): [number, number] | undefined {
  const at = ISSUERS[id]?.at;
  return at ? [at[0], at[1]] : centroid(id);
}

/**
 * Sanctions a country receives, and those it takes part in imposing (directly, or through the EU
 * when `euMember`). Rows come from the curated list.
 */
export function sanctionsFor(iso3: string, euMember: boolean, rows: SanctionRow[] = sanctions.items) {
  return {
    received: rows.filter((r) => r.target === iso3),
    imposed: rows
      .filter((r) => r.by.includes(iso3) || (euMember && r.by.includes("EU")))
      .map((r) => ({ ...r, via: r.by.includes(iso3) ? null : "EU" })),
  };
}

/** Most and least aligned partners in UN General Assembly votes. */
export function alignment(agree: Record<string, number>, iso3: string, n = 5) {
  const rows = Object.entries(agree)
    .filter(([k]) => k !== iso3)
    .sort((a, b) => b[1] - a[1]);
  return { most: rows.slice(0, n), least: rows.slice(-n).reverse() };
}
