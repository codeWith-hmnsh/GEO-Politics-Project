// Relation status between countries (docs/ARCHITECTURE.md §5, simplified for MVP).
// Order: curated row for (a, b) → curated row for (b, a) → rules from blocs → neutral.

export type RelStatus = "ally" | "hostile" | "mixed" | "neutral";
export type CuratedRelation = { a: string; b: string; status: string; basis: string };
export type RelationRow = { iso3: string; status: RelStatus; basis: string; source: "curated" | "rule" };

type Org = { id: string; members: string[] };

const RULE_BLOCS: Record<string, string> = { NATO: "Fellow NATO members", EU: "Fellow EU members" };

export function relationsFor(iso3: string, curated: CuratedRelation[], orgs: Org[]): Map<string, RelationRow> {
  const out = new Map<string, RelationRow>();
  for (const org of orgs) {
    const basis = RULE_BLOCS[org.id];
    if (!basis || !org.members.includes(iso3)) continue;
    for (const m of org.members) if (m !== iso3 && !out.has(m)) out.set(m, { iso3: m, status: "ally", basis, source: "rule" });
  }
  // Rows written from the other side apply too, unless this country has its own row.
  for (const r of curated) {
    if (r.b === iso3) out.set(r.a, { iso3: r.a, status: r.status as RelStatus, basis: r.basis, source: "curated" });
  }
  for (const r of curated) {
    if (r.a === iso3) out.set(r.b, { iso3: r.b, status: r.status as RelStatus, basis: r.basis, source: "curated" });
  }
  return out;
}

export const REL_COLORS: Record<RelStatus, string> = {
  ally: "#2fa36b",
  hostile: "#e5484d",
  mixed: "#e8a21c",
  neutral: "#4c74d9",
};

export const REL_LABEL: Record<RelStatus, string> = {
  ally: "Ally / partner",
  hostile: "Hostile",
  mixed: "Mixed",
  neutral: "Neutral",
};
