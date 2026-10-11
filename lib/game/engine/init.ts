// Build the start world from a frozen season seed, then calibrate so a do-nothing world holds steady.
import { suggestCards } from "./cards";
import { SCENARIOS, buildEventDeck } from "./events";
import { growthDrags, potentialGrowth } from "./phases";
import { REGION_DEFS } from "./regions";
import { computeWarnings, resolveTurn } from "./resolve";
import { ENGINE_VERSION, INTEREST, PC_PER_TURN, START_YEAR, UNIT_VALUE } from "./rules";
import { dimensions, powerIndex, ranks, rentShare, selfSufficiency } from "./score";
import type { CountryState, Good, Iso3, Ministry, PairState, Rating, RegionState, ScenarioId, WorldState } from "./types";
import { GOODS, MINISTRIES, RATINGS, REGIONS, SEATS } from "./types";
import { clamp } from "./util";

export interface SeedCountry {
  iso3: Iso3;
  name: string;
  gdp: number; // $B
  growth: number;
  inflation: number;
  unemployment: number;
  debtPct: number;
  rating: Rating;
  taxRate: number;
  treasury: number;
  budget: Record<Ministry, number>; // % of GDP
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
  goods: Record<Good, { prod: number; demand: number; reserve: number }>;
}

export interface Seed {
  season: string;
  needsEditorialReview: boolean;
  sources: string[];
  countries: Record<Iso3, SeedCountry>;
  relations: Partial<Record<Iso3, Partial<Record<Iso3, number>>>>;
  market: Record<Good, { baseDemand: number }>;
}

export interface CreateOptions {
  matchId: string;
  seed: number;
  scenario: ScenarioId;
}

function ratingPoints(c: CountryState) {
  return ((c.debt / c.gdp) * 100 * c.debtSavingsFactor) / 30 - c.growth / 3 - (c.stability - 50) / 25;
}

export function createWorld(seedData: Seed, opts: CreateOptions): WorldState {
  const countries = {} as Record<Iso3, CountryState>;
  for (const s of SEATS) {
    const d = seedData.countries[s];
    const budget = { ...d.budget };
    const c: CountryState = {
      iso3: s,
      name: d.name,
      gdp: d.gdp,
      growth: d.growth,
      growth0: d.growth,
      inflation: d.inflation,
      inflation0: d.inflation,
      treasury: d.treasury,
      debt: (d.debtPct / 100) * d.gdp,
      rating: d.rating,
      ratingOffset: 0,
      taxRate: d.taxRate,
      budget,
      baseline: { ...budget },
      index: Object.fromEntries(MINISTRIES.map((m) => [m, 50])) as Record<Ministry, number>,
      resourceRent: d.resourceRent,
      debtSavingsFactor: d.debtSavingsFactor,
      growthBase: 0,
      inflationAnchor: d.inflation,
      importBill0: 0,
      exportEarn0: 0,
      importBill: 0,
      exportEarn: 0,
      deficitPct: 0,
      balancePct: 0,
      population: d.population,
      popGrowth: d.popGrowth,
      workforce: d.workforce,
      workforceGrowth: d.workforceGrowth,
      unemployment: d.unemployment,
      unemployment0: d.unemployment,
      productivityTrend: d.growth - d.workforceGrowth,
      skills: d.skills,
      health: d.health,
      health0: d.health,
      stability: d.stability,
      stability0: d.stability,
      stabilityBase: d.stability,
      educationHistory: [],
      industry: d.industry,
      infrastructure: d.infrastructure,
      tradeCapacity: d.tradeCapacity,
      military: d.military,
      goods: Object.fromEntries(GOODS.map((g) => [g, { ...d.goods[g], supplyRatio: 1 }])) as CountryState["goods"],
      reserveCap: Object.fromEntries(GOODS.map((g) => [g, d.goods[g].reserve])) as Record<Good, number>,
      prodGrowth: { energy: 0, food: 0, tech: 0 },
      influence: d.influence,
      influenceBase: 0,
      pc: PC_PER_TURN,
      projects: [],
      completed: [],
      slots: 1,
      gdp0: d.gdp,
      ref: { industry: d.industry, rentShare: 0, selfSuff: 0, skills: d.skills, debtPct: d.debtPct },
      flags: [],
      imfTurnsLeft: 0,
      lastCards: [],
      shownCards: [],
      programmeEffects: [],
    };
    // calibrate: production grows with start demand, so the start world is balanced
    const pcg = d.growth - d.popGrowth;
    c.prodGrowth = { energy: (0.6 * d.growth) / 100, food: d.popGrowth / 100 + (0.2 * pcg) / 100, tech: (0.8 * d.growth) / 100 };
    countries[s] = c;
  }

  // pairs
  const pairs = {} as Record<Iso3, Record<Iso3, PairState>>;
  for (const a of SEATS) {
    pairs[a] = {} as Record<Iso3, PairState>;
    for (const b of SEATS) {
      const r = seedData.relations[a]?.[b] ?? seedData.relations[b]?.[a] ?? 0;
      pairs[a][b] = { relations: r, base: r, trust: clamp(50 + r / 4), tariff: 0, sanction: false, embargo: [] };
    }
  }

  // market: base supply set so world supply = world demand at price 100
  const market = {} as WorldState["market"];
  for (const g of GOODS) {
    const prod = SEATS.reduce((t, s) => t + countries[s].goods[g].prod, 0);
    const dem = SEATS.reduce((t, s) => t + countries[s].goods[g].demand, 0);
    const baseDemand = seedData.market[g].baseDemand;
    market[g] = { baseDemand, baseSupply: Math.max(1, dem + baseDemand - prod), shock: 0 };
  }

  const regions = Object.fromEntries(
    REGIONS.map((r) => {
      const sway = Object.fromEntries(SEATS.map((s) => [s, REGION_DEFS[r].sway0[s] ?? 0])) as Record<Iso3, number>;
      const top = [...SEATS].sort((a, b) => sway[b] - sway[a])[0];
      return [r, { id: r, sway, leader: sway[top] >= 25 ? top : null } satisfies RegionState];
    }),
  ) as WorldState["regions"];

  const w: WorldState = {
    engineVersion: ENGINE_VERSION,
    matchId: opts.matchId,
    seed: opts.seed,
    scenario: opts.scenario,
    turn: 1,
    year: START_YEAR,
    price: { energy: 100, food: 100, tech: 100 },
    tension: 30,
    globalGrowth: 0,
    countries,
    pairs,
    treaties: [],
    market,
    regions,
    vote: null,
    resolutions: [],
    pendingCrises: {},
    eventDeck: buildEventDeck(opts.seed, opts.scenario),
    history: [],
    dims: {} as WorldState["dims"],
    power: {} as WorldState["power"],
    warnings: {},
    par: null,
    ended: false,
  };

  // start trade at price 100: importers' bills and exporters' earnings, used as the steady reference
  for (const s of SEATS) {
    const c = countries[s];
    let imp = 0;
    let exp = 0;
    for (const g of GOODS) {
      const net = c.goods[g].demand - c.goods[g].prod;
      if (net > 0) imp += net * UNIT_VALUE[g];
      else exp += -net * UNIT_VALUE[g];
    }
    c.importBill0 = c.importBill = (imp / c.gdp) * 100;
    c.exportEarn0 = c.exportEarn = (exp / c.gdp) * 100;
    const revenue = (c.gdp * c.taxRate) / 100;
    const interest = (c.debt * INTEREST[c.rating] * (c.debtSavingsFactor < 1 ? c.debtSavingsFactor : 1)) / 100;
    const spend = (c.gdp * MINISTRIES.reduce((t, m) => t + c.budget[m], 0)) / 100;
    c.deficitPct = ((spend + interest - revenue) / c.gdp) * 100;
    c.balancePct = c.exportEarn0 * c.resourceRent - c.deficitPct;
    c.growthBase = c.growth - potentialGrowth({ ...c, growthBase: 0 }) + growthDrags(c);
    c.ratingOffset = RATINGS.indexOf(c.rating) - ratingPoints(c);
    c.ref = { ...c.ref, industry: c.industry, rentShare: rentShare(c), selfSuff: selfSufficiency(c) };
  }

  // influence calibration: the influence target equals the start value
  for (const s of SEATS) {
    const c = countries[s];
    const o = SEATS.filter((x) => x !== s);
    const avgRel = o.reduce((t, x) => t + pairs[x][s].relations, 0) / o.length;
    const led = REGIONS.filter((r) => regions[r].leader === s).length;
    c.influenceBase = c.influence - (0.3 * (avgRel + 100)) / 2 - 4 * led;
  }

  SCENARIOS[opts.scenario].setup(w);

  for (const s of SEATS) {
    const d = dimensions(w, s);
    w.dims[s] = [d];
    w.power[s] = [Math.round(powerIndex(d) * 100) / 100];
  }
  w.warnings = computeWarnings(w);
  for (const s of SEATS) w.countries[s].shownCards = suggestCards(w, s);
  w.par = computePar(w);
  return w;
}

/** Play the match with nobody acting, to get the par line for every seat. */
export function computePar(w: WorldState): NonNullable<WorldState["par"]> {
  let idle = w;
  const rankAt: Record<Iso3, number[]> = Object.fromEntries(SEATS.map((s) => [s, [ranks(w)[s]]])) as Record<Iso3, number[]>;
  while (!idle.ended) {
    idle = resolveTurn(idle, {}, []);
    const r = ranks(idle);
    for (const s of SEATS) rankAt[s].push(r[s]);
  }
  return Object.fromEntries(SEATS.map((s) => [s, { dims: idle.dims[s], rank: rankAt[s] }])) as NonNullable<WorldState["par"]>;
}
