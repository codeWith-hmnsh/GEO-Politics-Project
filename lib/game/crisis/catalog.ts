// Home policies, secret agendas and the six seats for the Crisis Table.
import type { AgendaDef, Iso3, Meters, Personality, PolicyDef, Theme } from "./types";

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

export const POLICIES: PolicyDef[] = [
  { id: "energyDeal", name: "Long-term energy deal", line: "Economy +2 · halves energy crisis damage", effect: { economy: 2 }, shield: "energy" },
  { id: "grainReserve", name: "Grain reserves", line: "People +1 · halves food crisis damage", effect: { people: 1 }, shield: "food" },
  { id: "supplyChains", name: "Diversify supply chains", line: "Economy +1 · halves trade crisis damage", effect: { economy: 1 }, shield: "trade" },
  { id: "reserves", name: "Build currency reserves", line: "Economy −1 · halves money crisis damage", effect: { economy: -1 }, shield: "money" },
  { id: "hospitals", name: "Hospitals and clinics", line: "People +2 · halves health crisis damage", effect: { people: 2, economy: -1 }, shield: "health" },
  { id: "cyberDefence", name: "Security services", line: "Military +2 · halves security crisis damage", effect: { military: 2, economy: -1 }, shield: "security" },
  { id: "stimulus", name: "Stimulus package", line: "Economy +5 · People −1 (prices rise)", effect: { economy: 5, people: -1 } },
  { id: "marketReform", name: "Market reforms", line: "Economy +6 · People −3", effect: { economy: 6, people: -3 } },
  { id: "jobs", name: "Jobs programme", line: "People +5 · Economy −2", effect: { people: 5, economy: -2 } },
  { id: "welfare", name: "Health and pensions", line: "People +6 · Economy −3", effect: { people: 6, economy: -3 } },
  { id: "skills", name: "Schools and skills", line: "Economy +2 · People +2 · Military −1", effect: { economy: 2, people: 2, military: -1 } },
  { id: "defence", name: "Raise defence budget", line: "Military +6 · Economy −2 · Allies −1", effect: { military: 6, economy: -2, allies: -1 } },
  { id: "navy", name: "Expand the navy", line: "Military +4 · Economy −1", effect: { military: 4, economy: -1 } },
  { id: "summit", name: "Summit diplomacy", line: "Allies +5 · Military −1", effect: { allies: 5, military: -1 } },
  { id: "aid", name: "Foreign aid", line: "Allies +6 · Economy −2", effect: { allies: 6, economy: -2 } },
  { id: "tradePact", name: "Trade pact", line: "Economy +3 · Allies +2 · People −1", effect: { economy: 3, allies: 2, people: -1 } },
  { id: "armsExports", name: "Sell weapons abroad", line: "Economy +4 · Military +1 · Allies −3", effect: { economy: 4, military: 1, allies: -3 } },
  { id: "greenPower", name: "Solar and wind build-out", line: "Economy +2 · People +2 · Allies +1 · Military −1", effect: { economy: 2, people: 2, allies: 1, military: -1 } },
];

export const POLICY_BY_ID = new Map(POLICIES.map((p) => [p.id, p]));
export const SHIELD_FOR: Record<Theme, string> = { energy: "energyDeal", food: "grainReserve", trade: "supplyChains", money: "reserves", health: "hospitals", security: "cyberDefence" };

const gain = (m: keyof Meters, by: number) => (s: { seats: Record<Iso3, { meters: Meters; start: Meters }> }, iso: Iso3) => Math.max(0, Math.min(1, (s.seats[iso].meters[m] - s.seats[iso].start[m]) / by));

export const AGENDAS: AgendaDef[] = [
  { id: "missions", title: "Coalition builder", goal: "Be part of 3 joint answers that work", progress: (m, iso) => Math.min(1, m.seats[iso].joinedWins / 3) },
  { id: "hawk", title: "Iron fist", goal: "Escalate 3 times", progress: (m, iso) => Math.min(1, m.seats[iso].escalations / 3) },
  { id: "freeRider", title: "Smart rider", goal: "Gain from 3 joint answers without joining them", progress: (m, iso) => Math.min(1, m.seats[iso].freeRides / 3) },
  { id: "honest", title: "Word of honour", goal: "Keep 4 pledges and break none", progress: (m, iso) => (m.seats[iso].pledgesBroken ? 0 : Math.min(1, m.seats[iso].pledgesKept / 4)) },
  { id: "growth", title: "Economic miracle", goal: "Raise Economy by 15", progress: gain("economy", 15) },
  { id: "people", title: "People's champion", goal: "Raise People by 15", progress: gain("people", 15) },
  { id: "power", title: "Rising power", goal: "Raise Military by 12", progress: gain("military", 12) },
  { id: "friends", title: "Friends everywhere", goal: "Raise Allies by 15", progress: gain("allies", 15) },
];

export const AGENDA_BY_ID = new Map(AGENDAS.map((a) => [a.id, a]));
