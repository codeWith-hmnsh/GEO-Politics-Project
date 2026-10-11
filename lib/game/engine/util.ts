import type { CountryState, Good, Iso3, WorldState } from "./types";
import { SEATS } from "./types";

export const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
export const round2 = (x: number) => Math.round(x * 100) / 100;

/** Deep copy for plain JSON state. structuredClone keeps it fast and exact. */
export const clone = <T>(x: T): T => structuredClone(x);

export const seats = (): Iso3[] => [...SEATS];
export const others = (me: Iso3): Iso3[] => SEATS.filter((s) => s !== me);

export const debtPct = (c: CountryState) => (c.debt / c.gdp) * 100;
export const pctOfGdp = (c: CountryState, pct: number) => (c.gdp * pct) / 100;

/** Supply minus demand, in units. Positive = surplus. */
export const surplus = (c: CountryState, g: Good) => c.goods[g].prod - c.goods[g].demand;
export const isExporter = (c: CountryState, g: Good) => surplus(c, g) > 0.5;

export function pair(w: WorldState, a: Iso3, b: Iso3) {
  return w.pairs[a][b];
}

/** Least-squares slope of the last n values. */
export function slope(values: number[], n = 3): number {
  const v = values.slice(-n);
  if (v.length < 2) return 0;
  const xm = (v.length - 1) / 2;
  const ym = v.reduce((s, y) => s + y, 0) / v.length;
  let num = 0;
  let den = 0;
  v.forEach((y, x) => {
    num += (x - xm) * (y - ym);
    den += (x - xm) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/** Round every number in a country state to 2 decimals (end of each phase, SYSTEMS §12). */
export function roundCountry(c: CountryState) {
  for (const k of Object.keys(c) as (keyof CountryState)[]) {
    const v = c[k];
    if (typeof v === "number") (c as unknown as Record<string, number>)[k] = round2(v);
  }
  for (const g of Object.keys(c.goods) as Good[]) {
    const gs = c.goods[g];
    gs.prod = round2(gs.prod);
    gs.demand = round2(gs.demand);
    gs.reserve = round2(gs.reserve);
    gs.supplyRatio = round2(gs.supplyRatio * 100) / 100;
  }
  for (const m of Object.keys(c.budget) as (keyof typeof c.budget)[]) {
    c.budget[m] = round2(c.budget[m]);
    c.index[m] = round2(c.index[m]);
  }
}
