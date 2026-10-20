// Secret agendas and the six seats for the Crisis Table. Home responses live in responses.ts.
import type { AgendaDef, Iso3, Meters, Personality } from "./types";

/** Starting meters, rounded from each country's real 2026 position. */
export const START: Record<Iso3, Meters> = {
  USA: { economy: 80, people: 56, military: 92, allies: 70 },
  CHN: { economy: 76, people: 62, military: 80, allies: 46 },
  IND: { economy: 58, people: 52, military: 62, allies: 60 },
  RUS: { economy: 44, people: 50, military: 84, allies: 32 },
  SAU: { economy: 60, people: 64, military: 52, allies: 56 },
  JPN: { economy: 70, people: 66, military: 46, allies: 72 },
};

/** Who trusts whom at the start (0..100); missing pairs start at 50. */
export const TRUST_START: [Iso3, Iso3, number][] = [
  ["USA", "JPN", 80],
  ["CHN", "RUS", 70],
  ["USA", "SAU", 62],
  ["IND", "RUS", 62],
  ["IND", "JPN", 64],
  ["IND", "USA", 58],
  ["USA", "CHN", 32],
  ["USA", "RUS", 22],
  ["JPN", "CHN", 36],
  ["IND", "CHN", 34],
  ["JPN", "RUS", 30],
];

export const PERSONALITIES: Personality[] = ["loyal", "dealmaker", "hawk", "freeRider"];
export const PERSONALITY_WORD: Record<Personality, string> = { loyal: "Team player", dealmaker: "Dealmaker", hawk: "Hawk", freeRider: "Opportunist" };

const gain = (m: keyof Meters, by: number) => (s: { seats: Record<Iso3, { meters: Meters; start: Meters }> }, iso: Iso3) => Math.max(0, Math.min(1, (s.seats[iso].meters[m] - s.seats[iso].start[m]) / by));

export const AGENDAS: AgendaDef[] = [
  { id: "missions", title: "Coalition builder", goal: "Be part of 3 joint answers that work", progress: (m, iso) => Math.min(1, m.seats[iso].joinedWins / 3) },
  { id: "hawk", title: "Iron fist", goal: "Escalate 3 times", progress: (m, iso) => Math.min(1, m.seats[iso].escalations / 3) },
  { id: "freeRider", title: "Smart rider", goal: "Gain from 3 joint answers without joining them", progress: (m, iso) => Math.min(1, m.seats[iso].freeRides / 3) },
  { id: "honest", title: "Word of honour", goal: "Keep 4 pledges and break none", progress: (m, iso) => (m.seats[iso].pledgesBroken ? 0 : Math.min(1, m.seats[iso].pledgesKept / 4)) },
  { id: "growth", title: "Economic miracle", goal: "Raise Economy by 15", progress: gain("economy", 15) },
  { id: "people", title: "People's champion", goal: "Raise People by 15", progress: gain("people", 15) },
  { id: "power", title: "Rising power", goal: "Raise Military by 9", progress: gain("military", 9) },
  { id: "friends", title: "Friends everywhere", goal: "Raise Allies by 15", progress: gain("allies", 15) },
];

export const AGENDA_BY_ID = new Map(AGENDAS.map((a) => [a.id, a]));
