// Capability Index (docs/CONTENT-GUIDE.md §4): a rough 0–10 estimate of the size of air, land and sea forces,
// built only from published counts. Not a prediction of who would win a war.

export type CapabilityInputs = {
  iso3: string;
  aircraft: number;
  tanks: number;
  warships: number;
  carriers: number;
  /** Active armed forces personnel (World Bank). */
  personnel?: number;
};

/** `sea` is null for countries with no navy (shown as "—", not 0). */
export type CapabilityScore = { air: number; land: number; sea: number | null; overall: number };

/** MVP subset of the CONTENT-GUIDE §4 method; weights shown verbatim in "How we calculate". */
export const CAPABILITY_FORMULA = {
  air: [["Combat aircraft", 1]],
  land: [["Active personnel", 0.5], ["Main battle tanks", 0.5]],
  sea: [["Warships and submarines", 0.6], ["Aircraft carriers (×3)", 0.4]],
} as const;

export const CAPABILITY_WHAT = {
  is: "A rough 0–10 estimate of the size of a country's air, land and sea forces, built only from published numbers.",
  isNot: "A prediction of who would win a war. It ignores training, technology quality, morale, alliances, geography and nuclear weapons.",
};

/** n(x) = log(1 + x) / log(1 + world_max(x)): 0 for none, 1 for the largest. */
function n(x: number | undefined, max: number) {
  if (!x || x <= 0 || max <= 0) return 0;
  return Math.log10(1 + x) / Math.log10(1 + max);
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function capabilityScores(rows: CapabilityInputs[]): Map<string, CapabilityScore> {
  const max = (f: (r: CapabilityInputs) => number | undefined) => Math.max(0, ...rows.map((r) => f(r) ?? 0));
  const m = {
    aircraft: max((r) => r.aircraft),
    tanks: max((r) => r.tanks),
    personnel: max((r) => r.personnel),
    warships: max((r) => r.warships),
    carriers: max((r) => r.carriers * 3),
  };
  const out = new Map<string, CapabilityScore>();
  for (const r of rows) {
    const air = 10 * n(r.aircraft, m.aircraft);
    const land = 10 * (0.5 * n(r.personnel, m.personnel) + 0.5 * n(r.tanks, m.tanks));
    const hasNavy = r.warships > 0 || r.carriers > 0;
    const sea = hasNavy ? 10 * (0.6 * n(r.warships, m.warships) + 0.4 * n(r.carriers * 3, m.carriers)) : null;
    const parts = [air, land, ...(sea === null ? [] : [sea])];
    out.set(r.iso3, {
      air: round1(air),
      land: round1(land),
      sea: sea === null ? null : round1(sea),
      overall: round1(parts.reduce((a, b) => a + b, 0) / parts.length),
    });
  }
  return out;
}
