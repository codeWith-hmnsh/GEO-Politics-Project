// Statecraft 5.0, the Crisis Table (docs: "Statecraft 5.0: crisis table meets nation building").
// Pure data types: no React, no clock, no global randomness.
import type { Iso3 } from "../engine/types";

export type { Iso3 };

/** The four answers every crisis offers, always in this order. */
export const CHOICES = ["coop", "self", "hard", "wait"] as const;
export type Choice = (typeof CHOICES)[number];

export const METERS = ["economy", "people", "military", "allies"] as const;
export type Meter = (typeof METERS)[number];
export type Meters = Record<Meter, number>;
export type MeterDelta = Partial<Meters>;

export type Theme = "energy" | "food" | "trade" | "money" | "health" | "security";

export type Personality = "loyal" | "dealmaker" | "hawk" | "freeRider";

export interface ChoiceText {
  title: string;
  line: string;
}

export interface CrisisDef {
  id: string;
  theme: Theme;
  title: string;
  place: { name: string; lat: number; lng: number };
  story: string;
  choices: Record<Choice, ChoiceText>;
  /** Blue picks needed for the joint answer to work (Escalate counts half where `hardHelps`). */
  need: number;
  hardHelps?: boolean;
  /** What each choice costs the leader who picks it. */
  cost: Record<Choice, MeterDelta>;
  /** Everyone gains this when the joint answer works. */
  win: MeterDelta;
  /** Everyone suffers this (times their exposure) when it fails. */
  lose: MeterDelta;
  /** How hard a failure hits each country: 1 = normal, 1.5 = badly, negative = profits from it. */
  exposure: Partial<Record<Iso3, number>>;
  oil?: { win: number; lose: number };
  success: string;
  failure: string;
  /** Crises this one tends to lead to, by outcome. */
  next?: { fail?: string; crowd?: string; escalate?: string; win?: string };
}

export type ResponseKind = "protect" | "invest" | "quick" | "bet" | "tough";

/** A home response to one crisis: always a trade-off, always explained by the crisis. */
export interface ResponseDef {
  id: string;
  kind: ResponseKind;
  name: string;
  /** One sentence: why this card belongs to this crisis. */
  why: string;
  effect: MeterDelta;
  /** Halves your crisis damage if the joint answer fails. */
  shield?: boolean;
  /** Extra gain only if the joint answer works. */
  ifWin?: MeterDelta;
  /** Raises world tension. */
  tension?: number;
}

export interface AgendaDef {
  id: string;
  title: string;
  goal: string;
  /** Progress 0..1 at the current state. */
  progress: (m: MatchState, iso: Iso3) => number;
}

export interface Pledge {
  iso3: Iso3;
  choice: Choice;
}

export interface ChatLine {
  iso3: Iso3;
  text: string;
  pledge?: Choice;
}

export interface SeatState {
  iso3: Iso3;
  meters: Meters;
  start: Meters;
  personality: Personality;
  /** 0..1, how often this leader keeps a pledge. */
  honesty: number;
  agenda: string;
  joinedWins: number;
  escalations: number;
  freeRides: number;
  pledgesKept: number;
  pledgesBroken: number;
}

export interface Reason {
  meter: Meter;
  delta: number;
  text: string;
}

export interface YearRecord {
  year: number;
  crisisId: string;
  picks: Record<Iso3, Choice>;
  pledges: Partial<Record<Iso3, Choice>>;
  policies: Partial<Record<Iso3, string[]>>;
  counts: Record<Choice, number>;
  success: boolean;
  crowd: boolean;
  escalated: boolean;
  headline: string;
  reasons: Record<Iso3, Reason[]>;
  deltas: Record<Iso3, Meters>;
  broke: Iso3[];
  oil: [number, number];
  tension: [number, number];
}

export interface MatchState {
  seed: number;
  me: Iso3;
  year: number;
  /** 1-based index of the current year. */
  turn: number;
  turns: number;
  seats: Record<Iso3, SeatState>;
  /** Trust from a to b, 0..100. */
  trust: Record<Iso3, Record<Iso3, number>>;
  oil: number;
  tension: number;
  crisisId: string;
  /** Crises already played, so the deck does not repeat inside a match. */
  used: string[];
  /** Crisis ids made more likely by last year's outcome. */
  pressure: string[];
  hands: Record<Iso3, string[]>;
  history: YearRecord[];
  ended: boolean;
}

export interface Orders {
  choice: Choice;
  pledge?: Choice;
  policies: string[];
}
