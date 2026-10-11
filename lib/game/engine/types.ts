// Statecraft engine types (docs4.0/SYSTEMS.md §2). Pure data, shared by server, client and bots.

export const SEATS = ["CHN", "IND", "JPN", "RUS", "SAU", "USA"] as const; // sorted: engine iterates in this order
export type Iso3 = (typeof SEATS)[number];

export const GOODS = ["energy", "food", "tech"] as const;
export type Good = (typeof GOODS)[number];

export const MINISTRIES = ["industry", "infrastructure", "agriculture", "energy", "education", "welfare", "defence"] as const;
export type Ministry = (typeof MINISTRIES)[number];

export const REGIONS = ["EUR", "SEA", "SAS", "MENA", "SSA", "LATAM", "CAS", "OCE"] as const;
export type RegionId = (typeof REGIONS)[number];

export const DIMENSIONS = ["economy", "development", "security", "diplomacy", "stability"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type Rating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC";
export const RATINGS: Rating[] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"];

export type ScenarioId = "energyShock" | "foodCrisis" | "tradeWar" | "calmStart";
export type Trend = "improving" | "worsening" | "unchanging";

export interface GoodState {
  prod: number; // units per turn (1 unit ≈ 1% of world trade in that good)
  demand: number;
  reserve: number; // units stored
  supplyRatio: number; // last resolved supply / demand
}

export interface ActiveProject {
  id: string;
  turnsLeft: number;
  paused: boolean;
}

export interface CountryState {
  iso3: Iso3;
  name: string;

  // Economy
  gdp: number; // $B per year
  growth: number; // %
  growth0: number; // % at start
  inflation: number; // %
  inflation0: number;
  treasury: number; // $B
  debt: number; // $B
  rating: Rating;
  ratingOffset: number; // calibrated so the start rating matches the real one
  taxRate: number; // % of GDP, 10–35
  budget: Record<Ministry, number>; // % of GDP
  baseline: Record<Ministry, number>; // % of GDP at start
  index: Record<Ministry, number>; // 0–100 ministry indices
  resourceRent: number; // share of export earnings reaching the treasury
  debtSavingsFactor: number; // 0.5 for Japan: domestic savings soften debt in the rating
  growthBase: number; // calibrated so a do-nothing start holds growth steady
  inflationAnchor: number;
  importBill0: number; // % of GDP at start
  exportEarn0: number; // % of GDP at start
  importBill: number; // % of GDP this turn
  exportEarn: number; // % of GDP this turn
  deficitPct: number; // policy deficit (spending + interest − tax), % of GDP
  balancePct: number; // overall budget balance incl. export rent and projects, % of GDP (+ = surplus)

  // People
  population: number; // millions
  popGrowth: number; // % per year
  workforce: number; // millions
  workforceGrowth: number; // % per year
  unemployment: number; // %
  unemployment0: number;
  productivityTrend: number; // % per year
  skills: number;
  health: number;
  health0: number;
  stability: number;
  stability0: number;
  stabilityBase: number; // calibrated
  educationHistory: number[]; // education index by turn, for the 3-turn lag

  // Capacity
  industry: number;
  infrastructure: number;
  tradeCapacity: number; // units per turn through treaties
  military: number;

  goods: Record<Good, GoodState>;
  reserveCap: Record<Good, number>;
  prodGrowth: Record<Good, number>; // natural yearly capacity growth, calibrated to start demand growth

  // Standing
  influence: number;
  pc: number;
  projects: ActiveProject[];
  completed: string[]; // project ids completed
  slots: number;
  gdp0: number;
  ref: { industry: number; rentShare: number; selfSuff: number; skills: number; debtPct: number }; // start values for missions
  influenceBase: number; // calibrated
  flags: string[];
  imfTurnsLeft: number;
  lastCards: string[]; // card ids played last turn
  shownCards: string[]; // card ids suggested last turn
  programmeEffects: { id: string; turnsLeft: number }[];
}

export interface PairState {
  relations: number; // −100..100
  base: number; // relations drift back toward this
  trust: number; // 0..100
  tariff: number; // % on imports from the other side
  sanction: boolean;
  embargo: Good[];
}

export type Term =
  | { kind: "goods"; good: Good; units: number; priceAdj: number } // priceAdj: −0.2..0.2 vs world price at signing
  | { kind: "money"; amount: number } // $B one-off grant
  | { kind: "investment"; amount: number } // $B, raises the receiver's infrastructure and industry
  | { kind: "tariffCut" }
  | { kind: "pledge"; pledge: "noSanction" | "noBuyFrom"; target?: Iso3 };

export interface Proposal {
  id: string;
  turn: number;
  from: Iso3;
  to: Iso3;
  gives: Term[]; // from → to
  wants: Term[]; // to → from
  turns: number;
  status: "pending" | "accepted" | "rejected" | "countered" | "expired";
  parentId?: string;
}

export interface Treaty {
  id: string;
  a: Iso3; // proposer
  b: Iso3;
  aGives: Term[];
  bGives: Term[];
  turnsLeft: number;
  startTurn: number;
  prices: Partial<Record<Good, number>>; // world price index at signing
}

export interface RegionState {
  id: RegionId;
  sway: Record<Iso3, number>;
  leader: Iso3 | null;
}

export interface VoteState {
  resolutionId: string;
  target?: Iso3;
  votes: Partial<Record<Iso3, "yes" | "no" | "abstain">>;
  passed?: boolean;
}

export interface ActiveResolution {
  resolutionId: string;
  target?: Iso3;
  turnsLeft: number;
}

export interface WorldState {
  engineVersion: string;
  matchId: string;
  seed: number;
  scenario: ScenarioId;
  turn: number; // 1..12; the turn about to be played
  year: number;
  price: Record<Good, number>;
  tension: number;
  globalGrowth: number;
  countries: Record<Iso3, CountryState>;
  pairs: Record<Iso3, Record<Iso3, PairState>>;
  treaties: Treaty[];
  market: Record<Good, { baseSupply: number; baseDemand: number; shock: number }>;
  regions: Record<RegionId, RegionState>;
  vote: VoteState | null; // the vote to cast this turn
  resolutions: ActiveResolution[];
  pendingCrises: Partial<Record<Iso3, string[]>>; // crisis ids waiting for a choice this turn
  eventDeck: string[]; // event ids, seeded order
  history: TurnRecord[];
  dims: Record<Iso3, Record<Dimension, number>[]>; // dimension values per turn (index 0 = start)
  power: Record<Iso3, number[]>; // power index per turn
  warnings: Partial<Record<Iso3, Warning[]>>;
  /** "Par": the same world if every leader did nothing. Leader Score measures play against it. */
  par: Record<Iso3, { dims: Record<Dimension, number>[]; rank: number[] }> | null;
  ended: boolean;
}

export interface PlayedCard {
  cardId: string;
  params: CardParams;
}

export interface CardParams {
  target?: Iso3;
  region?: RegionId;
  good?: Good;
  units?: number;
  rate?: number;
  amount?: number; // $B
  treatyId?: string;
}

export interface TurnOrders {
  taxRate?: number;
  budget?: Partial<Record<Ministry, number>>; // % of GDP
  projects?: string[]; // project ids to start
  cards?: PlayedCard[];
  crisis?: Record<string, string>; // crisis id → choice id
  vote?: "yes" | "no" | "abstain";
  proposalsSent?: number; // PC spent on proposals this turn
}

export interface Cause {
  id: string;
  field: string; // `${iso3}.${field}`
  delta: number;
  label: string;
  actor?: Iso3 | "event" | "market" | "world";
  sourceRef?: string;
  parent?: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  icon: "energy" | "food" | "tech" | "trade" | "diplomacy" | "unrest" | "disaster" | "economy" | "vote" | "project";
  place?: string;
  iso3?: Iso3;
  weight: number;
}

export interface GlobeEvent {
  kind: "flow" | "sanction" | "tariff" | "event" | "project" | "treaty" | "influence";
  from?: Iso3 | RegionId;
  to?: Iso3 | RegionId;
  good?: Good;
  units?: number;
  label?: string;
}

export interface Warning {
  id: "protests" | "debt" | "shortage" | "jobs" | "prices";
  text: string;
  cards: string[];
}

export interface TurnRecord {
  turn: number;
  year: number;
  moves: Partial<Record<Iso3, string>>; // headline move per seat
  causes: Cause[];
  news: NewsItem[];
  globe: GlobeEvent[];
  dropped: { iso3: Iso3; reason: string }[];
  eventId?: string;
  vote?: VoteState;
  completed: { iso3: Iso3; projectId: string }[];
  deltas: Partial<Record<Iso3, Record<string, number>>>;
}
