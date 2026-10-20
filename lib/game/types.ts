// Game types v2 (docs/GAME-PLAN.md §2). Shared between client and server.
// Key change from v1: simulation is deterministic. AI is narrator only.

// ──── Country state ────

/** Full state of a country within a match. */
export interface CountryState {
  // Identity
  iso3: string;
  name: string;

  // Economy
  gdp: number;            // billions USD
  gdpGrowth: number;      // %
  budget: number;         // spending units available this round
  inflation: number;      // %
  unemployment: number;   // %
  debtToGdp: number;      // %
  tradeBalance: number;   // positive = surplus

  // Resources (0-100% of need met)
  oil: number;
  food: number;
  minerals: number;
  technology: number;
  energy: number;

  // Military
  militaryBudget: number;
  armyStrength: number;   // personnel count
  airForce: number;       // aircraft
  navy: number;           // major vessels
  nuclearWarheads: number;
  missileDefense: number; // 0-100
  militaryMorale: number; // 0-100

  // Domestic
  stability: number;      // 0-100
  healthScore: number;    // 0-100
  educationScore: number; // 0-100
  infrastructure: number; // 0-100
  population: number;     // millions
  happiness: number;      // 0-100

  // International
  reputation: number;     // 0-100
  sanctions: string[];    // ISO3 codes sanctioning us
  alliances: string[];    // ISO3 codes of allies
  enemies: string[];      // ISO3 codes at war with

  // Computed
  overallScore: number;
  worldStatus: "stable" | "tension" | "crisis" | "war";
}

// ──── Match types ────

export type MatchStatus = "lobby" | "starting" | "active" | "finished";
export type MatchPhase = "lobby" | "plan" | "execute" | "react" | "ended";

export interface MatchPlayer {
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  iso3: string | null;
  countryState: CountryState | null;
  score: number;
  isReady: boolean;
}

export interface Match {
  id: string;
  code: string;         // 6-char join code
  status: MatchStatus;
  round: number;
  maxRounds: number;
  phase: MatchPhase;
  phaseEndsAt: string | null;
  hostPlayerId: string;
  players: MatchPlayer[];
  createdAt: string;
  startedAt: string | null;
}

// ──── Action types (GAME-PLAN §2.2) ────

export type DomesticAction =
  | "build_hospitals"
  | "invest_education"
  | "build_infrastructure"
  | "subsidize_fuel"
  | "print_money"
  | "raise_taxes"
  | "cut_military"
  | "invest_renewables";

export type TradeAction =
  | "propose_trade_deal"
  | "impose_tariff"
  | "embargo_exports"
  | "buy_resources"
  | "sanction";

export type MilitaryAction =
  | "mobilize_troops"
  | "launch_missile"
  | "naval_blockade"
  | "cyber_attack"
  | "nuclear_threat"
  | "send_troops"
  | "retreat_ceasefire";

export type DiplomacyAction =
  | "request_military_help"
  | "request_economic_aid"
  | "propose_alliance"
  | "break_alliance"
  | "un_resolution"
  | "peace_treaty"
  | "intelligence_sharing";

export type GameActionType = DomesticAction | TradeAction | MilitaryAction | DiplomacyAction;

/** What the player queues each round. */
export interface PlayerAction {
  type: GameActionType;
  targetIso3?: string;  // null for domestic actions
  params?: Record<string, unknown>;
}

// ──── Deterministic effect types (no AI here) ────

/** A single stat change on one country. */
export interface StatChange {
  field: keyof CountryState;
  delta: number;      // additive change (+5, -3)
  reason: string;     // "Built 10 hospitals"
}

/** Result of processing one action through the deterministic engine. */
export interface ActionResult {
  actionId: string;
  action: PlayerAction;
  actorIso3: string;
  /** Direct stat changes on the acting country. */
  actorEffects: StatChange[];
  /** Direct stat changes on the target country (if any). */
  targetEffects: StatChange[];
  /** Supply chain / alliance cascade effects on other countries. */
  cascadeEffects: Array<{
    iso3: string;
    changes: StatChange[];
  }>;
  /** Whether this action triggered a war state. */
  triggersWar: boolean;
}

// ──── AI narrator output (separate from simulation) ────

/** What Gemini generates AFTER the deterministic engine runs. */
export interface NarratedEvent {
  headline: string;
  description: string;
  tone: "neutral" | "crisis" | "war" | "positive" | "economic";
}

// ──── World events (per round) ────

export interface WorldEvent {
  id: string;
  round: number;
  headline: string;
  description: string;
  affectedCountries: string[];
  severity: "info" | "warning" | "critical" | "war";
  sourceActionId?: string;
}

// ──── Diplomatic requests ────

export type RequestType =
  | "military_help"
  | "economic_aid"
  | "trade_deal"
  | "alliance"
  | "peace_treaty"
  | "intelligence"
  | "resource_buy";

export type RequestStatus = "pending" | "accepted" | "declined" | "expired";

export interface DiplomaticRequest {
  id: string;
  round: number;
  fromPlayerId: string;
  fromIso3: string;
  toPlayerId: string;
  toIso3: string;
  requestType: RequestType;
  params: Record<string, unknown>;
  status: RequestStatus;
  responseParams?: Record<string, unknown>;
}

// ──── Scoring (GAME-PLAN §3.1) ────

export interface ScoreBreakdown {
  humanDevelopment: number; // 25% — avg(health, education, happiness)
  economicStrength: number; // 25% — growth, inflation, unemployment, trade
  security: number;         // 20% — stability, no wars, defense
  diplomacy: number;        // 15% — reputation, alliances, treaties
  infrastructure: number;   // 10% — infrastructure, energy independence
  growth: number;           // 5%  — improvement from start
  total: number;
}

// ──── Rankings ────

export interface PlayerRanking {
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  matchesPlayed: number;
  matchesWon: number;
  bestCountry: string | null;
  bestScore: number;
  title: string | null;
  badges: string[];
}

// ──── Match history ────

export interface MatchHistoryEvent {
  round: number;
  headline: string;
  actorIso3: string;
  targetIso3?: string;
  severity: "info" | "warning" | "critical" | "war";
}

export interface MatchHistory {
  matchId: string;
  timeline: MatchHistoryEvent[];
  finalStandings: Array<{
    rank: number;
    iso3: string;
    playerName: string;
    score: number;
    title: string;
  }>;
  summary: string;
  durationMinutes: number;
  totalRounds: number;
  playerCount: number;
}

// ──── Starting country data ────

/** The 8 countries available in MVP. Real-world data seeds these. */
export const MVP_COUNTRIES = [
  "USA", "CHN", "IND", "RUS", "DEU", "JPN", "BRA", "GBR",
] as const;

export type MvpCountry = (typeof MVP_COUNTRIES)[number];
