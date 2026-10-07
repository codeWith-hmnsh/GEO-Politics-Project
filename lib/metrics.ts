// Mode metrics (docs/PRD.md §9.4–9.5): one metric colours the globe at a time.
import type { Mode } from "@/lib/store";

export type MetricId =
  | "growth"
  | "inflation"
  | "unemployment"
  | "debt"
  | "gdp"
  | "trade"
  | "milPct"
  | "milUsd"
  | "personnel"
  | "armsImports"
  | "nuclear"
  | "capability";

export type MetricDef = {
  id: MetricId;
  mode: Exclude<Mode, "home">;
  label: string;
  /** Long label for panels. */
  title: string;
  source: string;
  /** Glossary term id for the title chip. */
  term?: string;
  /** Use a log scale for skewed totals (GDP, budgets, troops). */
  log?: boolean;
  format: (v: number) => string;
  /** One plain sentence: "what this number means" (CONTENT-GUIDE §2.2). */
  meaning: (v: number) => string;
};

const pct = (v: number) => `${v.toFixed(1)}%`;
const usd = (v: number) =>
  v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toFixed(0)}`;
const count = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`);

export const METRICS: MetricDef[] = [
  {
    id: "growth", mode: "economy", term: "gdp-growth", label: "Growth", title: "GDP growth", source: "IMF World Economic Outlook",
    format: pct,
    meaning: (v) => `The economy grew ${v.toFixed(1)}% in a year. Above 5% is fast for a large economy; below 0 means it shrank.`,
  },
  {
    id: "inflation", mode: "economy", term: "inflation", label: "Inflation", title: "Inflation", source: "IMF World Economic Outlook",
    format: pct,
    meaning: (v) => `Prices rise about ${v.toFixed(0)}% a year. Many central banks aim for 2–4%.`,
  },
  {
    id: "unemployment", mode: "economy", term: "unemployment", label: "Jobs", title: "Unemployment", source: "IMF World Economic Outlook",
    format: pct,
    meaning: (v) => `About ${Math.round(v)} in 100 people who want work cannot find it.`,
  },
  {
    id: "debt", mode: "economy", term: "debt-to-gdp", label: "Debt", title: "Government debt", source: "IMF World Economic Outlook",
    format: (v) => `${Math.round(v)}% of GDP`,
    meaning: (v) => `The government owes ${Math.round(v)}% of one year's economic output.`,
  },
  {
    id: "gdp", mode: "economy", term: "gdp", label: "GDP size", title: "GDP (US dollars)", source: "IMF World Economic Outlook", log: true,
    format: usd,
    meaning: () => "The total value of goods and services the country produces in a year.",
  },
  {
    id: "trade", mode: "economy", label: "Trade", title: "Trade (% of GDP)", source: "World Bank",
    format: (v) => `${Math.round(v)}% of GDP`,
    meaning: (v) => `Exports plus imports equal ${Math.round(v)}% of the economy. Higher means the country depends more on trade with the world.`,
  },
  {
    id: "milPct", mode: "defense", label: "Spending", title: "Military spending (% of GDP)", source: "SIPRI via World Bank",
    format: pct,
    meaning: (v) => `Spends ${v.toFixed(1)}% of its economy on the military. NATO's long-standing guideline is 2%.`,
  },
  {
    id: "milUsd", mode: "defense", label: "Budget", title: "Military spending (US dollars)", source: "SIPRI via World Bank", log: true,
    format: usd,
    meaning: () => "Total yearly military budget in US dollars.",
  },
  {
    id: "personnel", mode: "defense", label: "Personnel", title: "Armed forces personnel", source: "World Bank (IISS-based)", log: true,
    format: count,
    meaning: (v) => `About ${count(v)} people serve in the armed forces.`,
  },
  {
    id: "armsImports", mode: "defense", label: "Arms imports", title: "Arms imports (SIPRI TIV)", source: "SIPRI via World Bank", log: true,
    format: (v) => `${Math.round(v / 1e6).toLocaleString("en-US")}M TIV`,
    meaning: () => "Volume of major weapons bought from abroad that year (SIPRI trend-indicator value, not price).",
  },
  {
    id: "nuclear", mode: "defense", label: "Nuclear", title: "Nuclear warheads (estimate)", source: "FAS Status of World Nuclear Forces 2025", log: true,
    format: (v) => `~${Math.round(v).toLocaleString()}`,
    meaning: () => "Estimated nuclear warheads. Exact numbers are secret; these are expert estimates.",
  },
  {
    id: "capability", mode: "defense", label: "Capability", title: "Capability Index (estimate)", source: "GeoPolitics estimate from IISS and World Bank counts",
    format: (v) => `${v.toFixed(1)} / 10`,
    meaning: () => "Average of the Air, Land and Sea size estimates. Not a ranking of who would win a war.",
  },
];

export const metricsFor = (mode: Exclude<Mode, "home">) => METRICS.filter((m) => m.mode === mode);
export const metricById = (id: MetricId) => METRICS.find((m) => m.id === id)!;

export const MODE_SCALES: Record<"economy" | "defense" | "energy" | "diplomacy", string[]> = {
  economy: ["#fff1c7", "#f6c25b", "#e57a3a", "#b3352c"],
  defense: ["#e8ecfa", "#9db4f0", "#3f63d8", "#1b2f7a"],
  energy: ["#e5f4d8", "#a6d88c", "#3fa765", "#16613d"],
  diplomacy: ["#f6e2ec", "#e2a1ba", "#c25a84", "#7a2450"],
};

export const MODE_COPY = {
  economy: { title: "Economy", question: "How strong is this economy, and who is it connected to?" },
  defense: { title: "Defense", question: "How secure and well-armed is this country?" },
  energy: { title: "Energy & Resources", question: "What powers this country, and who does it depend on?" },
  diplomacy: { title: "Diplomacy", question: "Who are this country's friends, rivals and blocs?" },
} as const;

/** Position of a value on the colour scale (0..1), robust to outliers via the 5th–95th percentile. */
export function scaleDomain(values: number[], log = false) {
  const v = values.filter((x) => Number.isFinite(x) && (!log || x > 0)).map((x) => (log ? Math.log10(x) : x)).sort((a, b) => a - b);
  if (!v.length) return { lo: 0, hi: 1, log };
  const q = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
  const lo = q(0.05);
  const hi = q(0.95);
  return { lo, hi: hi > lo ? hi : lo + 1, log };
}

export function scaleT(value: number, d: { lo: number; hi: number; log: boolean }) {
  const x = d.log ? Math.log10(Math.max(value, 1e-9)) : value;
  return Math.max(0, Math.min(1, (x - d.lo) / (d.hi - d.lo)));
}

export function scaleColor(stops: string[], t: number) {
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(s));
  const k = s - i;
  const a = parseInt(stops[i].slice(1), 16);
  const b = parseInt(stops[i + 1].slice(1), 16);
  const ch = (sh: number) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
