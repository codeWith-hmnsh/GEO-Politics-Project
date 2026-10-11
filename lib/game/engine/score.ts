// Power Index dimensions, Leader Score, missions and trends (docs4.0/SYSTEMS.md §11, GAME-DESIGN §12).
import { SCENARIOS } from "./events";
import { DIFFICULTY_BONUS, HANDICAP, POWER_WEIGHTS, SCORE, TREND_THRESHOLD } from "./rules";
import type { CountryState, Dimension, Iso3, Trend, WorldState } from "./types";
import { DIMENSIONS, SEATS } from "./types";
import { clamp, debtPct, slope } from "./util";

export function dimensions(w: WorldState, me: Iso3): Record<Dimension, number> {
  const c = w.countries[me];
  const others = SEATS.filter((s) => s !== me);
  const avgTrust = others.reduce((t, s) => t + w.pairs[s][me].trust, 0) / others.length;
  const perCapitaGrowth = c.growth - c.popGrowth;
  return {
    economy: clamp(18 * Math.log10(c.gdp) - 20 + 2 * c.growth),
    development: clamp(0.35 * c.skills + 0.25 * c.health + 0.25 * (100 - 4 * c.unemployment) + 3 * perCapitaGrowth),
    security: clamp(0.5 * c.military + 25 * Math.min(1, c.goods.energy.supplyRatio) + 25 * Math.min(1, c.goods.food.supplyRatio)),
    diplomacy: clamp(0.6 * c.influence + 0.4 * avgTrust),
    stability: clamp(0.7 * c.stability + 0.3 * (100 - 3 * Math.max(0, c.inflation - 3) - 0.2 * Math.max(0, debtPct(c) - 90))),
  };
}

export function powerIndex(d: Record<Dimension, number>): number {
  return DIMENSIONS.reduce((t, k) => t + d[k] * POWER_WEIGHTS[k], 0);
}

/** 1-based ranks by power index at a turn index (0 = start). Ties broken by ISO3 order. */
export function ranks(w: WorldState, at = -1): Record<Iso3, number> {
  const val = (s: Iso3) => w.power[s].at(at) ?? 0;
  const order = [...SEATS].sort((a, b) => val(b) - val(a) || a.localeCompare(b));
  return Object.fromEntries(order.map((s, i) => [s, i + 1])) as Record<Iso3, number>;
}

export function trend(w: WorldState, me: Iso3, dim: Dimension): Trend {
  const k = slope(w.dims[me].map((d) => d[dim]));
  return k > TREND_THRESHOLD ? "improving" : k < -TREND_THRESHOLD ? "worsening" : "unchanging";
}

// ───────── Missions (GAME-DESIGN §3.1) ─────────

export interface MissionDef {
  text: string;
  /** 0..1 progress. */
  progress: (w: WorldState, c: CountryState) => number;
}

const rentShare = (c: CountryState) => {
  const revenue = (c.gdp * c.taxRate) / 100;
  const rent = (c.exportEarn / 100) * c.gdp * c.resourceRent;
  return rent / (revenue + rent || 1);
};
export const selfSufficiency = (c: CountryState) => c.goods.energy.prod / c.goods.energy.demand;

export const MISSIONS: Record<Iso3, MissionDef> = {
  IND: {
    text: "Jobs for a young country: unemployment below 2.5% and skills 75+",
    progress: (_w, c) => 0.5 * clamp((c.unemployment0 - c.unemployment) / Math.max(0.5, c.unemployment0 - 2.5), 0, 1) + 0.5 * clamp((c.skills - c.ref.skills) / Math.max(1, 75 - c.ref.skills), 0, 1),
  },
  CHN: {
    text: "Energy independence: self-sufficiency from 80% to 100%",
    progress: (_w, c) => clamp((selfSufficiency(c) - c.ref.selfSuff) / Math.max(0.01, 1 - c.ref.selfSuff), 0, 1),
  },
  USA: {
    text: "Stay #1 in Power and cut debt below 110% of GDP",
    progress: (w, c) => (ranks(w).USA === 1 ? 0.5 : 0) + 0.5 * clamp((c.ref.debtPct - debtPct(c)) / Math.max(1, c.ref.debtPct - 110), 0, 1),
  },
  RUS: {
    text: "Beyond oil and gas: grow industry by 15%",
    progress: (_w, c) => clamp((c.industry / (c.ref.industry || 1) - 1) / 0.15, 0, 1),
  },
  SAU: {
    text: "Vision for diversification: industry +20% with stability 60+",
    progress: (_w, c) => 0.6 * clamp((c.industry / (c.ref.industry || 1) - 1) / 0.2, 0, 1) + (c.stability >= 60 ? 0.4 : 0),
  },
  JPN: {
    text: "Energy security: self-sufficiency from 12% to 50%",
    progress: (_w, c) => clamp((selfSufficiency(c) - c.ref.selfSuff) / (0.5 - c.ref.selfSuff), 0, 1),
  },
};

export { rentShare };

export interface ScoreBreakdown {
  improvement: number;
  mission: number;
  rankClimb: number;
  objectives: number;
  difficulty: number;
  total: number;
  objectivesMet: string[];
}

export function leaderScore(w: WorldState, me: Iso3): ScoreBreakdown {
  const t = w.dims[me].length - 1;
  const now = w.dims[me][t];
  const ref = w.par?.[me].dims[t] ?? w.dims[me][0];
  // diminishing returns per dimension, so one runaway number cannot carry a match
  const soft = (x: number) => Math.sign(x) * 10 * Math.log1p(Math.abs(x) / 10);
  const mean = DIMENSIONS.reduce((x, d) => x + soft(now[d] - ref[d]), 0) / DIMENSIONS.length;
  const improvement = clamp(SCORE.improvementMult * HANDICAP[me] * mean, -SCORE.improvementCap, SCORE.improvementCap);
  const mission = SCORE.missionMax * MISSIONS[me].progress(w, w.countries[me]);
  const r0 = w.par?.[me].rank[t] ?? ranks(w, 0)[me];
  const r1 = ranks(w)[me];
  const rankClimb = r1 < r0 ? (r0 - r1) * SCORE.rankUp : (r1 - r0) * SCORE.rankDown;
  const objectivesMet = SCENARIOS[w.scenario].objectives.filter((o) => o.met(w, me)).map((o) => o.id);
  const objectives = objectivesMet.length * SCORE.objectiveMax;
  const difficulty = DIFFICULTY_BONUS[me];
  const total = Math.round(SCORE.base + improvement + mission + rankClimb + objectives + difficulty);
  return { improvement, mission, rankClimb, objectives, difficulty, total: clamp(total, 0, 1000), objectivesMet };
}

/** Winner: highest Leader Score; ties → better final Power rank. */
export function standings(w: WorldState): { iso3: Iso3; score: number; rank: number }[] {
  const r = ranks(w);
  return SEATS.map((s) => ({ iso3: s, score: leaderScore(w, s).total, rank: r[s] })).sort((a, b) => b.score - a.score || a.rank - b.rank);
}
