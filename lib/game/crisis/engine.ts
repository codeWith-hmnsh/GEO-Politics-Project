// The Crisis Table engine: deal a year, let bots talk and decide, resolve six secret choices together.
// Deterministic: every random draw comes from a seeded stream, so a match replays exactly.
import { stream } from "../engine/rng";
import { SEATS } from "../engine/types";
import { AGENDAS, AGENDA_BY_ID, PERSONALITIES, START, TRUST_START } from "./catalog";
import { CRISES, CRISIS_BY_ID } from "./deck";
import { RESPONSES, RESPONSE_BY_ID } from "./responses";
import type { ChatLine, Choice, CrisisDef, Iso3, MatchState, Meter, MeterDelta, Meters, Orders, Personality, Reason, SeatState, YearRecord } from "./types";
import { CHOICES, METERS } from "./types";

export const TURNS = 10;
export const START_YEAR = 2026;
export const POLICY_PICKS = 2;
export const HAND_SIZE = 4;
/** Score points for each joint answer you helped win. */
const STATESMAN = 5;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const zero = (): Meters => ({ economy: 0, people: 0, military: 0, allies: 0 });

export function crisisOf(m: MatchState): CrisisDef {
  return CRISIS_BY_ID.get(m.crisisId)!;
}

/** Two secret agendas to choose from when the match starts. */
export function agendaOffer(seed: number, me: Iso3): [string, string] {
  const r = stream(seed, 0, `offer:${me}`);
  const ids = AGENDAS.map((a) => a.id);
  const a = ids.splice(Math.floor(r() * ids.length), 1)[0];
  const b = ids[Math.floor(r() * ids.length)];
  return [a, b];
}

export function newMatch(seed: number, me: Iso3, agenda?: string): MatchState {
  const r = stream(seed, 0, "setup");
  const seats = {} as Record<Iso3, SeatState>;
  for (const s of SEATS) {
    const personality: Personality = PERSONALITIES[Math.floor(r() * PERSONALITIES.length)];
    const base = { loyal: 0.9, dealmaker: 0.65, hawk: 0.8, freeRider: 0.4 }[personality];
    seats[s] = {
      iso3: s,
      meters: { ...START[s] },
      start: { ...START[s] },
      personality,
      honesty: clamp(base + (r() - 0.5) * 0.2, 0.2, 1),
      agenda: s === me && agenda ? agenda : AGENDAS[Math.floor(r() * AGENDAS.length)].id,
      joinedWins: 0,
      escalations: 0,
      freeRides: 0,
      pledgesKept: 0,
      pledgesBroken: 0,
    };
  }
  const trust = {} as Record<Iso3, Record<Iso3, number>>;
  for (const a of SEATS) {
    trust[a] = {} as Record<Iso3, number>;
    for (const b of SEATS) trust[a][b] = a === b ? 100 : 50;
  }
  for (const [a, b, v] of TRUST_START) trust[a][b] = trust[b][a] = v;
  const m: MatchState = { seed, me, year: START_YEAR, turn: 1, turns: TURNS, seats, trust, oil: 100, tension: 30, crisisId: "", used: [], pressure: [], hands: {} as Record<Iso3, string[]>, history: [], ended: false };
  m.crisisId = drawCrisis(m);
  m.used.push(m.crisisId);
  for (const s of SEATS) m.hands[s] = dealHand(m, s);
  return m;
}

/** Next crisis: unplayed ones, weighted toward what last year's outcome set up and, when tension runs high, toward security. */
export function drawCrisis(m: MatchState): string {
  const r = stream(m.seed, m.turn, "crisis");
  const pool = CRISES.filter((c) => !m.used.includes(c.id));
  const list = pool.length ? pool : CRISES;
  // the first year opens on a clear, classic crisis
  if (m.turn === 1) {
    const opener = ["hormuz", "monsoon", "chips", "pandemic"];
    return opener[Math.floor(r() * opener.length)];
  }
  const w = list.map((c) => (m.pressure.includes(c.id) ? 6 : 1) + (c.theme === "security" && m.tension >= 55 ? 2 : 0));
  let t = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) if ((t -= w[i]) <= 0) return list[i].id;
  return list[list.length - 1].id;
}

/** The four home responses to this year's crisis, in a seeded order so the best card is never always on top. */
export function dealHand(m: MatchState, iso: Iso3): string[] {
  const r = stream(m.seed, m.turn, `hand:${iso}`);
  const hand = RESPONSES[m.crisisId].map((x) => x.id);
  for (let i = hand.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [hand[i], hand[j]] = [hand[j], hand[i]];
  }
  return hand.slice(0, HAND_SIZE);
}

// ───────── bots ─────────

const BIAS: Record<Personality, Record<Choice, number>> = {
  loyal: { coop: 1.5, self: -0.5, hard: -1, wait: 0.5 },
  dealmaker: { coop: 0, self: 2.5, hard: -0.5, wait: 0.5 },
  hawk: { coop: -0.5, self: 0, hard: 4, wait: -1 },
  freeRider: { coop: -1, self: 1.5, hard: -0.5, wait: 2 },
};
const WEIGHT: Record<Personality, Record<Meter, number>> = {
  loyal: { economy: 1, people: 1, military: 0.8, allies: 1.4 },
  dealmaker: { economy: 1.3, people: 1, military: 0.8, allies: 0.9 },
  hawk: { economy: 1, people: 1.1, military: 1.3, allies: 0.7 },
  freeRider: { economy: 1.2, people: 1, military: 0.9, allies: 0.8 },
};
const BASE_COOP: Record<Personality, number> = { loyal: 0.55, dealmaker: 0.3, hawk: 0.2, freeRider: 0.25 };
const AGENDA_BIAS: Record<string, Partial<Record<Choice, number>>> = {
  missions: { coop: 2.5 },
  hawk: { hard: 4 },
  freeRider: { wait: 2.5, self: 1.5, coop: -1 },
  power: { hard: 1.5 },
  friends: { coop: 2 },
};

const value = (d: MeterDelta, w: Record<Meter, number>) => METERS.reduce((t, k) => t + (d[k] ?? 0) * w[k], 0);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** How likely each other leader is to cooperate, as `iso` sees it: a pledge counts by trust, silence by reputation. */
function coopOdds(m: MatchState, iso: Iso3, pledges: Partial<Record<Iso3, Choice>>, s: Iso3) {
  const seat = m.seats[s];
  const kept = seat.pledgesKept + seat.pledgesBroken ? seat.pledgesKept / (seat.pledgesKept + seat.pledgesBroken) : 0.7;
  if (pledges[s] === "coop") return clamp(0.25 + 0.45 * (m.trust[iso][s] / 100) + 0.3 * kept, 0, 0.95);
  if (pledges[s]) return 0.05;
  return s === m.me ? habit(m, s) : BASE_COOP[seat.personality];
}

/** The table learns your habits: a leader who always cooperates is counted on, and free riders lean on them. */
function habit(m: MatchState, s: Iso3) {
  const n = m.history.length;
  const coop = m.history.filter((h) => h.picks[s] === "coop").length;
  return (coop + 0.9) / (n + 2);
}

/** How likely the joint answer is to work, as `iso` sees it, if it picks `ch`. */
function successOdds(m: MatchState, iso: Iso3, pledges: Partial<Record<Iso3, Choice>>, ch: Choice) {
  const c = crisisOf(m);
  const others = SEATS.filter((s) => s !== iso);
  const expCoop = others.reduce((t, s) => t + coopOdds(m, iso, pledges, s), 0);
  const expHard = c.hardHelps ? others.reduce((t, s) => t + (pledges[s] === "hard" ? 0.6 : 0.15), 0) * 0.5 : 0;
  const eff = expCoop + expHard + (ch === "coop" ? 1 : 0) + (ch === "hard" && c.hardHelps ? 0.5 : 0);
  return sigmoid((eff - c.need + 0.5) * 2.2);
}

/** A bot's best answer, given what it believes the others will do. */
export function decideBot(m: MatchState, iso: Iso3, pledges: Partial<Record<Iso3, Choice>>, salt = "decide"): Choice {
  const r = stream(m.seed, m.turn, `${salt}:${iso}`);
  const c = crisisOf(m);
  const seat = m.seats[iso];
  const w = WEIGHT[seat.personality];
  const exposure = c.exposure[iso] ?? 1;
  let best: Choice = "wait";
  let bestV = -Infinity;
  for (const ch of CHOICES) {
    const p = successOdds(m, iso, pledges, ch);
    const shield = ch === "self" ? 0.4 : 1;
    let v = value(c.cost[ch], w) + p * value(c.win, w) + (1 - p) * value(c.lose, w) * exposure * shield;
    if (ch === "coop") v += p * 2 * w.allies - 1.5;
    v += BIAS[seat.personality][ch] + (AGENDA_BIAS[seat.agenda]?.[ch] ?? 0) + (r() - 0.5) * 3;
    if (v > bestV) {
      bestV = v;
      best = ch;
    }
  }
  return best;
}

export interface BotPlan {
  intended: Choice;
  pledge?: Choice;
}

/** At the start of a year every bot settles what it means to do, and maybe pledges (honestly or not). */
export function planBots(m: MatchState): { plan: Partial<Record<Iso3, BotPlan>>; chat: ChatLine[] } {
  const plan: Partial<Record<Iso3, BotPlan>> = {};
  const chat: ChatLine[] = [];
  const c = crisisOf(m);
  for (const s of SEATS) {
    if (s === m.me) continue;
    const r = stream(m.seed, m.turn, `pledge:${s}`);
    const seat = m.seats[s];
    const intended = decideBot(m, s, {}, "intend");
    const talk = { loyal: 0.8, dealmaker: 0.55, hawk: 0.5, freeRider: 0.65 }[seat.personality];
    let pledge: Choice | undefined;
    if (r() < talk) pledge = intended !== "coop" && r() > seat.honesty ? "coop" : intended;
    plan[s] = { intended, pledge };
    const line = pledge ? PLEDGE_LINES[pledge][Math.floor(r() * 2)].replace("{x}", c.choices[pledge].title.toLowerCase()).replace("{n}", String(c.need)) : CHATTER[Math.floor(r() * CHATTER.length)];
    chat.push({ iso3: s, text: line, pledge });
  }
  return { plan, chat };
}

const PLEDGE_LINES: Record<Choice, [string, string]> = {
  coop: ["We're in. Count us for the {x}.", "Join us: {x}. We need {n}."],
  self: ["We'll go our own way this time: {x}.", "Sorry, we're handling this alone: {x}."],
  hard: ["Time to get tough. We choose: {x}.", "Weakness invites more of this. We act."],
  wait: ["Not our fight. We'll wait and see.", "We're staying out of this one."],
};
const CHATTER = ["Who is really joining this time?", "Talk is cheap. Watch what we do.", "We'll decide at the last minute.", "Remember who kept their word last year."];

/** Final bot choice: a bot that pledged sticks to what it meant; a silent bot reacts to everyone's pledges, yours included. */
function finalBotChoice(m: MatchState, iso: Iso3, plan: BotPlan | undefined, pledges: Partial<Record<Iso3, Choice>>): Choice {
  if (plan?.pledge) return plan.intended;
  return decideBot(m, iso, pledges);
}

function botPolicies(m: MatchState, iso: Iso3, ch: Choice, pledges: Partial<Record<Iso3, Choice>>): string[] {
  const r = stream(m.seed, m.turn, `policies:${iso}`);
  const c = crisisOf(m);
  const w = WEIGHT[m.seats[iso].personality];
  const p = successOdds(m, iso, pledges, ch);
  const hurt = -value(c.lose, w) * (c.exposure[iso] ?? 1) * (ch === "self" ? 0.4 : 1);
  return [...m.hands[iso]]
    .map((id) => {
      const x = RESPONSE_BY_ID.get(id)!;
      const v = value(x.effect, w) + (x.shield ? 0.5 * (1 - p) * hurt : 0) + (x.ifWin ? p * value(x.ifWin, w) : 0) + (x.tension && m.seats[iso].personality !== "hawk" ? -1 : 0);
      return { id, v: v + r() * 2 };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, POLICY_PICKS)
    .map((x) => x.id);
}

// ───────── resolve ─────────

export function resolveYear(m: MatchState, mine: Orders, plan: Partial<Record<Iso3, BotPlan>>): { next: MatchState; record: YearRecord } {
  const c = crisisOf(m);
  const pledges: Partial<Record<Iso3, Choice>> = {};
  for (const s of SEATS) if (s !== m.me && plan[s]?.pledge) pledges[s] = plan[s]!.pledge;
  if (mine.pledge) pledges[m.me] = mine.pledge;

  const picks = {} as Record<Iso3, Choice>;
  const policies: Partial<Record<Iso3, string[]>> = {};
  for (const s of SEATS) {
    picks[s] = s === m.me ? mine.choice : finalBotChoice(m, s, plan[s], pledges);
  }
  for (const s of SEATS) policies[s] = s === m.me ? mine.policies.filter((p) => m.hands[s].includes(p)).slice(0, POLICY_PICKS) : botPolicies(m, s, picks[s], pledges);

  const counts = { coop: 0, self: 0, hard: 0, wait: 0 } as Record<Choice, number>;
  for (const s of SEATS) counts[picks[s]]++;
  const effective = counts.coop + (c.hardHelps ? counts.hard * 0.5 : 0);
  const success = effective >= c.need;
  const crowd = counts.self >= 3;
  const escalated = counts.hard >= 2;
  const drift = counts.wait >= 4;

  const next: MatchState = structuredClone(m);
  const reasons = {} as Record<Iso3, Reason[]>;
  const deltas = {} as Record<Iso3, Meters>;
  const broke: Iso3[] = [];

  for (const s of SEATS) {
    const seat = next.seats[s];
    const d = zero();
    const why: Reason[] = [];
    const add = (delta: MeterDelta, text: string, k = 1) => {
      for (const key of METERS) {
        const v = Math.round((delta[key] ?? 0) * k);
        if (!v) continue;
        d[key] += v;
        why.push({ meter: key, delta: v, text });
      }
    };
    const ch = picks[s];
    add(c.cost[ch], `You chose: ${c.choices[ch].title}`);
    if (success) {
      add(c.win, c.success);
      for (const id of policies[s]!) {
        const x = RESPONSE_BY_ID.get(id)!;
        if (x.ifWin) add(x.ifWin, `Your bet paid off: ${x.name}`);
      }
      if (ch === "coop") {
        add({ allies: 1 }, "Part of the coalition that solved it");
        seat.joinedWins++;
      } else if (ch !== "hard") seat.freeRides++;
    } else {
      const shielded = policies[s]!.some((id) => RESPONSE_BY_ID.get(id)!.shield);
      const exposure = c.exposure[s] ?? 1;
      const k = exposure * (ch === "self" ? 0.4 : 1) * (shielded ? 0.5 : 1) * (drift ? 1.25 : 1);
      const note = exposure < 0 ? `${c.failure}: you profit from it` : ch === "self" ? `${c.failure}: your private deal softened it` : shielded ? `${c.failure}: your protection softened it` : c.failure;
      add(c.lose, note, k);
      if (ch === "coop") why.push({ meter: "allies", delta: 0, text: "Not enough leaders joined, so your cost bought nothing" });
    }
    if (crowd && ch === "self") add({ economy: -3 }, "Everyone scrambled for the same private deals");
    if (escalated && ch === "hard") add({ allies: -2 }, "Escalation spiral: the world sees you as a threat");
    if (ch === "hard") seat.escalations++;
    const pledged = pledges[s];
    if (pledged) {
      if (pledged !== ch) {
        add({ allies: -6 }, `Broke your pledge (${c.choices[pledged].title})`);
        seat.pledgesBroken++;
        broke.push(s);
      } else {
        seat.pledgesKept++;
        if (pledged === "coop") add({ allies: 1 }, "Kept your word to the table");
      }
    }
    for (const id of policies[s]!) {
      const x = RESPONSE_BY_ID.get(id)!;
      add(x.effect, `At home: ${x.name}`);
    }
    for (const key of METERS) {
      const before = seat.meters[key];
      seat.meters[key] = clamp(before + d[key]);
      d[key] = seat.meters[key] - before;
    }
    reasons[s] = why;
    deltas[s] = d;
  }

  // trust moves: kept and broken pledges, and partners in a joint answer
  for (const s of broke) for (const o of SEATS) if (o !== s) next.trust[o][s] = clamp(next.trust[o][s] - 15);
  const coopers = SEATS.filter((s) => picks[s] === "coop");
  for (const a of coopers) for (const b of coopers) if (a !== b) next.trust[a][b] = clamp(next.trust[a][b] + (success ? 5 : 2));
  for (const s of SEATS) if (pledges[s] && pledges[s] === picks[s]) for (const o of coopers) if (o !== s) next.trust[o][s] = clamp(next.trust[o][s] + 2);

  const oil0 = m.oil;
  const ten0 = m.tension;
  if (c.oil) next.oil = clamp(m.oil + (success ? c.oil.win : c.oil.lose), 60, 180);
  const homeTension = SEATS.reduce((t, s) => t + policies[s]!.reduce((u, id) => u + (RESPONSE_BY_ID.get(id)!.tension ?? 0), 0), 0);
  next.tension = clamp(m.tension + counts.hard * 5 + (success ? -6 : 5) + Math.round(homeTension / 3));

  const record: YearRecord = {
    year: m.year,
    crisisId: c.id,
    picks,
    pledges,
    policies,
    counts,
    success,
    crowd,
    escalated,
    headline: success ? c.success : c.failure,
    reasons,
    deltas,
    broke,
    oil: [oil0, next.oil],
    tension: [ten0, next.tension],
  };
  next.history.push(record);

  next.pressure = [];
  const n = c.next ?? {};
  if (!success && n.fail) next.pressure.push(n.fail);
  if (success && n.win) next.pressure.push(n.win);
  if (crowd && n.crowd) next.pressure.push(n.crowd);
  if (escalated && n.escalate) next.pressure.push(n.escalate);

  next.turn++;
  next.year++;
  if (next.turn > next.turns) {
    next.ended = true;
  } else {
    next.crisisId = drawCrisis(next);
    next.used.push(next.crisisId);
    for (const s of SEATS) next.hands[s] = dealHand(next, s);
  }
  return { next, record };
}

// ───────── score ─────────

export interface Score {
  total: number;
  improvement: number;
  agenda: number;
  statesman: number;
}

export function score(m: MatchState, iso: Iso3): Score {
  const seat = m.seats[iso];
  const improvement = METERS.reduce((t, k) => t + (seat.meters[k] - seat.start[k]) * 2.5, 0);
  const agenda = 100 * (AGENDA_BY_ID.get(seat.agenda)?.progress(m, iso) ?? 0);
  const statesman = STATESMAN * seat.joinedWins - 10 * seat.pledgesBroken;
  return { total: Math.round(clamp(500 + improvement + agenda + statesman, 0, 1000)), improvement: Math.round(improvement), agenda: Math.round(agenda), statesman };
}

export function standings(m: MatchState) {
  return SEATS.map((s) => ({ iso3: s, ...score(m, s) })).sort((a, b) => b.total - a.total);
}

/** Which crisis the outcome of last year pushed forward, for the "because" line in the briefing. */
export function becauseLine(m: MatchState): string | null {
  const last = m.history.at(-1);
  if (!last || !m.pressure.includes(m.crisisId)) return null;
  const prev = CRISIS_BY_ID.get(last.crisisId)!;
  if (last.escalated) return `Last year's escalation over "${prev.title}" made things worse.`;
  if (last.crowd) return `Last year everyone grabbed private deals during "${prev.title}".`;
  if (!last.success) return `Last year the world failed to answer "${prev.title}".`;
  return null;
}
