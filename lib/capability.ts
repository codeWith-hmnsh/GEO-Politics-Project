// Capability Index (docs/PRD.md §9.5, CONTENT-GUIDE §4): 0–10 per domain from published inputs only.
// An estimate of military means, never a ranking of who would win a war.

export type CapabilityInputs = {
  iso3: string;
  aircraft: number;
  tanks: number;
  warships: number;
  carriers: number;
  /** Military spending, US dollars (SIPRI via World Bank). */
  budget?: number;
  /** Active armed forces personnel (World Bank). */
  personnel?: number;
};

export type CapabilityScore = { air: number; land: number; sea: number; overall: number };

/** Weights shown verbatim in the "How we calculate" box. */
export const CAPABILITY_FORMULA = {
  air: [["Combat aircraft", 0.6], ["Military budget", 0.4]],
  land: [["Main battle tanks", 0.4], ["Active personnel", 0.35], ["Military budget", 0.25]],
  sea: [["Warships and submarines", 0.45], ["Aircraft carriers", 0.25], ["Military budget", 0.3]],
} as const;

/** log-share of the largest value in the set: 0 for none, 1 for the largest. */
function logShare(x: number | undefined, max: number) {
  if (!x || x <= 0 || max <= 0) return 0;
  return Math.log10(1 + x) / Math.log10(1 + max);
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function capabilityScores(rows: CapabilityInputs[]): Map<string, CapabilityScore> {
  const max = (k: keyof Omit<CapabilityInputs, "iso3">) => Math.max(0, ...rows.map((r) => r[k] ?? 0));
  const m = { aircraft: max("aircraft"), tanks: max("tanks"), warships: max("warships"), budget: max("budget"), personnel: max("personnel") };
  const out = new Map<string, CapabilityScore>();
  for (const r of rows) {
    const budget = logShare(r.budget, m.budget);
    const air = 10 * (0.6 * logShare(r.aircraft, m.aircraft) + 0.4 * budget);
    const land = 10 * (0.4 * logShare(r.tanks, m.tanks) + 0.35 * logShare(r.personnel, m.personnel) + 0.25 * budget);
    // Carriers count linearly up to three (a standing carrier presence).
    const sea = 10 * (0.45 * logShare(r.warships, m.warships) + 0.25 * Math.min(r.carriers, 3) / 3 + 0.3 * budget);
    out.set(r.iso3, { air: round1(air), land: round1(land), sea: round1(sea), overall: round1((air + land + sea) / 3) });
  }
  return out;
}
