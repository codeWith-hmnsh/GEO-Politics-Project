// Build data/game/seed-2026.json from the 1.0 data (docs4.0/GAME-DESIGN.md §3.2).
// Live indicators set GDP, growth, inflation, unemployment, debt and defence spending.
// Curated values below cover what the live data does not have; they are drafts for editorial review.
// Run: npx tsx lib/game/seed/build-seed.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Seed, SeedCountry } from "../engine/init";
import type { Good, Iso3, Ministry, Rating } from "../engine/types";
import { SEATS } from "../engine/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));

const indicators = read("data/live/indicators.json").payload.metrics as Record<string, { values: Record<string, { value: number }> }>;
const relations = read("data/curated/relations.json").items as { a: string; b: string; status: string }[];
const metric = (k: string, s: Iso3) => indicators[k]?.values?.[s]?.value;

interface Curated {
  name: string;
  rating: Rating;
  taxRate: number;
  treasury: number;
  /** Non-defence ministries, % of GDP. Defence comes from live military spending. */
  ministries: Omit<Record<Ministry, number>, "defence">;
  resourceRent: number;
  debtSavingsFactor: number;
  population: number;
  popGrowth: number;
  workforce: number;
  workforceGrowth: number;
  skills: number;
  health: number;
  stability: number;
  industry: number;
  infrastructure: number;
  tradeCapacity: number;
  military: number;
  influence: number;
  goods: Record<Good, { demand: number; selfSufficiency: number; reserve: number }>;
}

// Units: 1 unit ≈ 1% of world trade in that good. Self-sufficiency = production / demand.
const CURATED: Record<Iso3, Curated> = {
  USA: {
    name: "United States",
    rating: "AA",
    taxRate: 30,
    treasury: 700,
    ministries: { industry: 1.0, infrastructure: 2.5, agriculture: 0.6, energy: 0.8, education: 6.0, welfare: 15.2 },
    resourceRent: 0.05,
    debtSavingsFactor: 0.8,
    population: 340,
    popGrowth: 0.5,
    workforce: 170,
    workforceGrowth: 0.4,
    skills: 78,
    health: 72,
    stability: 55,
    industry: 70,
    infrastructure: 78,
    tradeCapacity: 60,
    military: 100,
    influence: 70,
    goods: { energy: { demand: 100, selfSufficiency: 1.05, reserve: 30 }, food: { demand: 30, selfSufficiency: 1.25, reserve: 5 }, tech: { demand: 40, selfSufficiency: 1.1, reserve: 0 } },
  },
  CHN: {
    name: "China",
    rating: "A",
    taxRate: 26,
    treasury: 1500,
    ministries: { industry: 4.0, infrastructure: 6.0, agriculture: 1.5, energy: 1.8, education: 4.0, welfare: 5.0 },
    resourceRent: 0.05,
    debtSavingsFactor: 0.7,
    population: 1410,
    popGrowth: -0.1,
    workforce: 770,
    workforceGrowth: -0.3,
    skills: 62,
    health: 70,
    stability: 68,
    industry: 85,
    infrastructure: 80,
    tradeCapacity: 70,
    military: 85,
    influence: 62,
    goods: { energy: { demand: 80, selfSufficiency: 0.8, reserve: 40 }, food: { demand: 60, selfSufficiency: 0.92, reserve: 30 }, tech: { demand: 45, selfSufficiency: 0.95, reserve: 0 } },
  },
  IND: {
    name: "India",
    rating: "BBB",
    taxRate: 19,
    treasury: 118,
    ministries: { industry: 1.5, infrastructure: 3.3, agriculture: 1.4, energy: 0.85, education: 3.0, welfare: 2.98 },
    resourceRent: 0.05,
    debtSavingsFactor: 1,
    population: 1460,
    popGrowth: 0.8,
    workforce: 600,
    workforceGrowth: 1.2,
    skills: 45,
    health: 55,
    stability: 62,
    industry: 58,
    infrastructure: 52,
    tradeCapacity: 30,
    military: 62,
    influence: 50,
    goods: { energy: { demand: 30, selfSufficiency: 0.6, reserve: 3 }, food: { demand: 50, selfSufficiency: 1.08, reserve: 15 }, tech: { demand: 15, selfSufficiency: 0.45, reserve: 0 } },
  },
  RUS: {
    name: "Russia",
    rating: "BB",
    taxRate: 33,
    treasury: 150,
    ministries: { industry: 3.0, infrastructure: 3.0, agriculture: 1.0, energy: 2.0, education: 3.5, welfare: 12.5 },
    resourceRent: 0.35,
    debtSavingsFactor: 1,
    population: 144,
    popGrowth: -0.3,
    workforce: 73,
    workforceGrowth: -0.5,
    skills: 66,
    health: 62,
    stability: 58,
    industry: 55,
    infrastructure: 58,
    tradeCapacity: 30,
    military: 80,
    influence: 40,
    goods: { energy: { demand: 20, selfSufficiency: 1.9, reserve: 5 }, food: { demand: 10, selfSufficiency: 1.2, reserve: 3 }, tech: { demand: 6, selfSufficiency: 0.35, reserve: 0 } },
  },
  SAU: {
    name: "Saudi Arabia",
    rating: "A",
    taxRate: 15,
    treasury: 400,
    ministries: { industry: 2.5, infrastructure: 4.0, agriculture: 0.7, energy: 2.5, education: 4.5, welfare: 4.5 },
    resourceRent: 0.6,
    debtSavingsFactor: 1,
    population: 34,
    popGrowth: 1.5,
    workforce: 16,
    workforceGrowth: 2.0,
    skills: 55,
    health: 68,
    stability: 66,
    industry: 45,
    infrastructure: 65,
    tradeCapacity: 30,
    military: 45,
    influence: 45,
    goods: { energy: { demand: 8, selfSufficiency: 3.0, reserve: 10 }, food: { demand: 6, selfSufficiency: 0.3, reserve: 2 }, tech: { demand: 3, selfSufficiency: 0.15, reserve: 0 } },
  },
  JPN: {
    name: "Japan",
    rating: "A",
    taxRate: 33,
    treasury: 300,
    ministries: { industry: 1.2, infrastructure: 3.5, agriculture: 0.9, energy: 1.0, education: 3.5, welfare: 18.5 },
    resourceRent: 0.05,
    debtSavingsFactor: 0.5,
    population: 123,
    popGrowth: -0.5,
    workforce: 69,
    workforceGrowth: -0.6,
    skills: 80,
    health: 85,
    stability: 70,
    industry: 75,
    infrastructure: 88,
    tradeCapacity: 40,
    military: 50,
    influence: 55,
    goods: { energy: { demand: 25, selfSufficiency: 0.12, reserve: 15 }, food: { demand: 10, selfSufficiency: 0.38, reserve: 3 }, tech: { demand: 15, selfSufficiency: 1.2, reserve: 0 } },
  },
};

const STATUS: Record<string, number> = { ally: 40, neutral: 0, mixed: -10, hostile: -50 };
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

const countries = {} as Record<Iso3, SeedCountry>;
for (const s of SEATS) {
  const k = CURATED[s];
  const gdp = Math.round((metric("gdp", s) ?? 0) / 1e9);
  const defence = r2(metric("milPct", s) ?? 2);
  countries[s] = {
    iso3: s,
    name: k.name,
    gdp,
    growth: r1(metric("growth", s) ?? 2),
    inflation: r1(metric("inflation", s) ?? 3),
    unemployment: r1(metric("unemployment", s) ?? 5),
    debtPct: r1(metric("debt", s) ?? 60),
    rating: k.rating,
    taxRate: k.taxRate,
    treasury: k.treasury,
    budget: { ...k.ministries, defence },
    resourceRent: k.resourceRent,
    debtSavingsFactor: k.debtSavingsFactor,
    population: k.population,
    popGrowth: k.popGrowth,
    workforce: k.workforce,
    workforceGrowth: k.workforceGrowth,
    skills: k.skills,
    health: k.health,
    stability: k.stability,
    industry: k.industry,
    infrastructure: k.infrastructure,
    tradeCapacity: k.tradeCapacity,
    military: k.military,
    influence: k.influence,
    goods: Object.fromEntries(
      (Object.keys(k.goods) as Good[]).map((g) => [g, { demand: k.goods[g].demand, prod: r2(k.goods[g].demand * k.goods[g].selfSufficiency), reserve: k.goods[g].reserve }]),
    ) as SeedCountry["goods"],
  };
}

const rel: Seed["relations"] = {};
for (const it of relations) {
  if (!SEATS.includes(it.a as Iso3) || !SEATS.includes(it.b as Iso3)) continue;
  (rel[it.a as Iso3] ??= {})[it.b as Iso3] = STATUS[it.status] ?? 0;
}

const seed: Seed = {
  season: "2026",
  needsEditorialReview: true,
  sources: [
    "data/live/indicators.json (IMF / World Bank): GDP, growth, inflation, unemployment, debt, military spending % of GDP",
    "data/curated/relations.json: starting relations (ally 40, neutral 0, mixed −10, hostile −50)",
    "lib/game/seed/build-seed.ts CURATED: budgets, goods units, people and capacity indices (draft, needs editorial review)",
  ],
  countries,
  relations: rel,
  market: { energy: { baseDemand: 40 }, food: { baseDemand: 30 }, tech: { baseDemand: 20 } },
};

const out = join(root, "data/game/seed-2026.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(seed, null, 2) + "\n");
console.log(`wrote ${out}`);
for (const s of SEATS) console.log(s, countries[s].gdp, countries[s].growth, countries[s].debtPct, countries[s].budget.defence);
