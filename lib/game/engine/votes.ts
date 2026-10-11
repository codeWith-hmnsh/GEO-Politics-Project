// World Vote resolutions (docs4.0/GAME-DESIGN.md §10.2, SYSTEMS §8.3).
import type { Ctx } from "./ctx";
import { stream } from "./rng";
import type { Iso3, RegionId, VoteState, WorldState } from "./types";
import { SEATS } from "./types";
import { isExporter } from "./util";

export interface ResolutionDef {
  id: string;
  title: (target?: Iso3, w?: WorldState) => string;
  goodFor: string;
  badFor: string;
  serves: RegionId[];
  /** Pick a target when the resolution names a country. */
  pickTarget?: (w: WorldState) => Iso3 | undefined;
  /** How much a seat gains (+) or loses (−) if it passes; bots vote with this. */
  impact: (w: WorldState, me: Iso3, target?: Iso3) => number;
  /** Once, the turn after it passes. */
  onPass?: (ctx: Ctx, target?: Iso3) => void;
  /** Every turn while active (before goods). */
  each?: (ctx: Ctx, target?: Iso3) => void;
  /** Weight in the deck given the world state. */
  weight: (w: WorldState) => number;
}

const importer = (w: WorldState, me: Iso3, g: "energy" | "food" | "tech") => w.countries[me].goods[g].demand > w.countries[me].goods[g].prod;

export const RESOLUTIONS: ResolutionDef[] = [
  {
    id: "oilPriceCap",
    title: () => "Oil price cap at 115 for 3 years",
    goodFor: "energy importers",
    badFor: "energy exporters",
    serves: ["SAS", "SSA", "SEA"],
    impact: (w, me) => (isExporter(w.countries[me], "energy") ? -10 : importer(w, me, "energy") ? 8 + Math.max(0, w.price.energy - 110) * 0.3 : 0),
    weight: (w) => 1 + Math.max(0, w.price.energy - 100) * 0.1,
  },
  {
    id: "globalSanctions",
    title: (t, w) => `Global sanctions on ${t && w ? w.countries[t].name : "a rogue state"}`,
    goodFor: "rivals of the target",
    badFor: "the target and its trade partners",
    serves: [],
    pickTarget: (w) => [...SEATS].sort((a, b) => avgRelTo(w, a) - avgRelTo(w, b))[0],
    impact: (w, me, t) => (me === t ? -30 : t ? Math.max(-8, Math.min(8, -w.pairs[me][t].relations / 8)) - (w.treaties.some((x) => (x.a === me && x.b === t) || (x.b === me && x.a === t)) ? 6 : 0) : 0),
    weight: (w) => (SEATS.some((s) => avgRelTo(w, s) < -20) ? 2 : 0.3),
  },
  {
    id: "cleanEnergyFund",
    title: () => "Clean energy fund for developing countries",
    goodFor: "energy importers and the Global South",
    badFor: "energy exporters; every member pays 0.1% of GDP",
    serves: ["SSA", "SAS"],
    impact: (w, me) => (isExporter(w.countries[me], "energy") ? -6 : 3),
    each: (ctx) => {
      for (const s of SEATS) {
        const c = ctx.w.countries[s];
        c.treasury -= c.gdp * 0.001;
        if (!isExporter(c, "energy")) ctx.s[s].demandShock.energy *= 0.98;
      }
    },
    weight: () => 1,
  },
  {
    id: "foodBanBan",
    title: () => "Ban on food export bans",
    goodFor: "food importers",
    badFor: "food exporters lose a tool",
    serves: ["MENA", "SSA", "SAS"],
    impact: (w, me) => (importer(w, me, "food") ? 6 + Math.max(0, w.price.food - 105) * 0.3 : -3),
    each: (ctx) => {
      ctx.world.marketShock.food += 0.02;
    },
    weight: (w) => 1 + Math.max(0, w.price.food - 100) * 0.1,
  },
  {
    id: "techOpen",
    title: () => "Open rules for the chip trade",
    goodFor: "tech importers",
    badFor: "tech leaders lose an edge",
    serves: ["LATAM", "SEA", "MENA"],
    impact: (w, me) => (importer(w, me, "tech") ? 6 : -4),
    each: (ctx) => {
      ctx.world.marketShock.tech += 0.04;
    },
    weight: (w) => (w.scenario === "tradeWar" ? 2 : 0.8),
  },
  {
    id: "shippingMission",
    title: () => "Joint mission to protect shipping lanes",
    goodFor: "importers and traders",
    badFor: "every member pays 0.05% of GDP",
    serves: ["MENA", "SEA"],
    impact: (w, me) => (importer(w, me, "energy") ? 5 : 1),
    onPass: (ctx) => {
      ctx.world.tensionAdd -= 3;
    },
    each: (ctx) => {
      for (const s of SEATS) {
        const c = ctx.w.countries[s];
        c.treasury -= c.gdp * 0.0005;
        ctx.s[s].tradeCapShock = Math.min(1, ctx.s[s].tradeCapShock * 1.1);
      }
    },
    weight: (w) => 1 + w.tension * 0.02,
  },
  {
    id: "debtReliefAfrica",
    title: () => "Debt relief for Africa",
    goodFor: "influence in Africa",
    badFor: "every member pays 0.1% of GDP once",
    serves: ["SSA"],
    impact: (w, me) => {
      const sw = w.regions.SSA.sway;
      return 4 - (sw[me] >= Math.max(...SEATS.map((s) => sw[s])) ? 0 : 1);
    },
    onPass: (ctx) => {
      for (const s of SEATS) {
        const c = ctx.w.countries[s];
        c.treasury -= c.gdp * 0.001;
      }
    },
    weight: () => 0.8,
  },
];

function avgRelTo(w: WorldState, s: Iso3) {
  const o = SEATS.filter((x) => x !== s);
  return o.reduce((t, x) => t + w.pairs[x][s].relations, 0) / o.length;
}

export const RESOLUTION_BY_ID = new Map(RESOLUTIONS.map((r) => [r.id, r]));

/** Draw the resolution for a vote turn, weighted by the current world. */
export function drawResolution(w: WorldState): VoteState {
  const rand = stream(w.seed, w.turn, "vote");
  const active = new Set(w.resolutions.map((r) => r.resolutionId));
  const pool = RESOLUTIONS.filter((r) => !active.has(r.id));
  const total = pool.reduce((t, r) => t + r.weight(w), 0);
  let x = rand() * total;
  let pick = pool[0];
  for (const r of pool) {
    x -= r.weight(w);
    if (x <= 0) {
      pick = r;
      break;
    }
  }
  return { resolutionId: pick.id, target: pick.pickTarget?.(w), votes: {} };
}

export function botVote(w: WorldState, me: Iso3, v: VoteState): "yes" | "no" | "abstain" {
  const r = RESOLUTION_BY_ID.get(v.resolutionId)!;
  const x = r.impact(w, me, v.target);
  return x > 1 ? "yes" : x < -1 ? "no" : "abstain";
}
