// The resolve context: the next state being built, the frozen start state, and per-turn accumulators.
import { CauseLog } from "./causes";
import { stream } from "./rng";
import type { Cause, GlobeEvent, Good, Iso3, NewsItem, Proposal, RegionId, TurnOrders, WorldState } from "./types";
import { SEATS } from "./types";

export type ModKind = "growth" | "inflation" | "stability" | "unemployment";

export interface Mod {
  kind: ModKind;
  value: number;
  causeId: string;
}

export interface PriorityBuy {
  buyer: Iso3;
  seller: Iso3 | "market";
  good: Good;
  units: number;
  premium: number; // price multiplier, e.g. 1.05
  causeId: string;
}

export interface TurnScratch {
  mods: Mod[];
  prodShock: Record<Good, number>; // multiplier for this turn only
  demandShock: Record<Good, number>;
  priority: PriorityBuy[];
  releaseReserve: Record<Good, boolean>;
  fuelSubsidy: boolean;
  tradeCapShock: number; // multiplier for this turn
  aidToRegion: Partial<Record<RegionId, number>>; // % of GDP
  tradeWithRegion: Partial<Record<RegionId, number>>; // units
  swayAdd: Partial<Record<RegionId, number>>;
  regionPenalty: Partial<Record<RegionId, number>>;
  aidGivenPct: number;
  investmentReceivedPct: number;
  treatiesKept: number;
  exportPush: Partial<Record<Good, number>>; // extra share to sell
  importValue: number; // $B this turn
  exportValue: number; // $B this turn
  tariffRevenue: number;
  tariffInflation: number;
  marketPremium: Record<Good, number>; // extra price multiplier on market purchases
  sanctionHit: number;
  pcSpent: number;
  fiscalImpulse: number;
  supplyCause: Partial<Record<Good, string>>;
}

const emptyScratch = (): TurnScratch => ({
  mods: [],
  prodShock: { energy: 1, food: 1, tech: 1 },
  demandShock: { energy: 1, food: 1, tech: 1 },
  priority: [],
  releaseReserve: { energy: false, food: false, tech: false },
  fuelSubsidy: false,
  tradeCapShock: 1,
  aidToRegion: {},
  tradeWithRegion: {},
  swayAdd: {},
  regionPenalty: {},
  aidGivenPct: 0,
  investmentReceivedPct: 0,
  treatiesKept: 0,
  exportPush: {},
  importValue: 0,
  exportValue: 0,
  tariffRevenue: 0,
  tariffInflation: 0,
  marketPremium: { energy: 1, food: 1, tech: 1 },
  sanctionHit: 0,
  pcSpent: 0,
  fiscalImpulse: 0,
  supplyCause: {},
});

export class Ctx {
  readonly causes: CauseLog;
  readonly news: NewsItem[] = [];
  readonly globe: GlobeEvent[] = [];
  readonly dropped: { iso3: Iso3; reason: string }[] = [];
  readonly moves: Partial<Record<Iso3, string>> = {};
  readonly completed: { iso3: Iso3; projectId: string }[] = [];
  readonly s: Record<Iso3, TurnScratch>;
  readonly world = { tensionAdd: 0, newTreaties: 0, globalGrowthAdd: 0, marketShock: { energy: 0, food: 0, tech: 0 } as Record<Good, number> };
  eventId?: string;
  private newsN = 0;

  constructor(
    readonly w: WorldState,
    readonly start: Readonly<WorldState>,
    readonly orders: Record<Iso3, TurnOrders>,
    readonly proposals: Proposal[],
    readonly forecastOnly: boolean,
  ) {
    this.causes = new CauseLog(w.turn);
    this.s = Object.fromEntries(SEATS.map((s) => [s, emptyScratch()])) as Record<Iso3, TurnScratch>;
  }

  rand(purpose: string) {
    return stream(this.w.seed, this.w.turn, purpose);
  }

  /** A temporary modifier applied in the macro / people phases, with its own cause record. */
  mod(iso3: Iso3, kind: ModKind, value: number, label: string, opts: { actor?: Cause["actor"]; sourceRef?: string; parent?: string } = {}) {
    const causeId = this.causes.add(iso3, kind, value, label, opts);
    this.s[iso3].mods.push({ kind, value, causeId });
    return causeId;
  }

  addNews(item: Omit<NewsItem, "id">) {
    this.news.push({ ...item, id: `${this.w.turn}:n${this.newsN++}` });
  }

  setMove(iso3: Iso3, text: string) {
    if (!this.moves[iso3]) this.moves[iso3] = text;
  }
}
