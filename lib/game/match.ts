// Turn runner shared by the solo client, the server and self-play: bots plan, deals are answered, the turn resolves.
import { acceptsCounter, answerProposal, decideTurn, type Difficulty } from "./bots/decide";
import { resolveTurn } from "./engine/resolve";
import { stream } from "./engine/rng";
import { proposalLegal } from "./engine/treaties";
import type { Iso3, Proposal, TurnOrders, WorldState } from "./engine/types";
import { SEATS } from "./engine/types";

export interface Plan {
  orders: Partial<Record<Iso3, TurnOrders>>;
  proposals: Proposal[];
}

const pid = (w: WorldState, from: Iso3, to: Iso3, n: number) => `${w.turn}-${from}-${to}-${n}`;

/** Bots decide at the start of planning, so their proposals can reach humans' inboxes. */
export function planBots(w: WorldState, botSeats: Iso3[], difficulty: Difficulty | Partial<Record<Iso3, Difficulty>>): Plan {
  const plan: Plan = { orders: {}, proposals: [] };
  for (const s of SEATS) {
    if (!botSeats.includes(s)) continue;
    const d = typeof difficulty === "string" ? difficulty : (difficulty[s] ?? "normal");
    const t = decideTurn(w, s, d, stream(w.seed, w.turn, `bot:${s}`));
    plan.orders[s] = t.orders;
    t.proposals.forEach((d, i) => {
      const p: Proposal = { ...d, id: pid(w, s, d.to, i), turn: w.turn, status: "pending" };
      if (botSeats.includes(d.to)) settleBotProposal(w, p, plan.proposals);
      else plan.proposals.push(p);
    });
  }
  return plan;
}

/** A proposal to a bot is answered at once; a counter goes back to the proposer. */
export function settleBotProposal(w: WorldState, p: Proposal, out: Proposal[], proposerIsBot = true): Proposal {
  if (proposalLegal(w, p) !== true) {
    p.status = "rejected";
    out.push(p);
    return p;
  }
  const a = answerProposal(w, p);
  if (a.status !== "countered") {
    p.status = a.status;
    out.push(p);
    return p;
  }
  p.status = "countered";
  out.push(p);
  const c: Proposal = { ...a.counter, id: `${p.id}-c`, turn: w.turn, parentId: p.id, status: "pending" };
  if (proposerIsBot) c.status = acceptsCounter(w, c) ? "accepted" : "rejected";
  out.push(c);
  return c;
}

/** Bot answer to a human proposal (solo and multiplayer). */
export function answerHumanProposal(w: WorldState, p: Proposal): Proposal[] {
  const out: Proposal[] = [];
  settleBotProposal(w, p, out, false);
  return out;
}

/** A bot seat decides on a pending human counter or human proposal addressed to it at lock time. */
export function closeTurn(w: WorldState, plan: Plan, humanOrders: Partial<Record<Iso3, TurnOrders>>, proposals: Proposal[]): WorldState {
  const orders = { ...plan.orders, ...humanOrders };
  const all = [...plan.proposals, ...proposals].map((p) => (p.status === "pending" ? { ...p, status: "expired" as const } : p));
  return resolveTurn(w, orders, all);
}

/** Run a full bot-only match. Used by self-play and tests. */
export function playBotMatch(w: WorldState, difficulty: Difficulty | Partial<Record<Iso3, Difficulty>> = "normal"): WorldState {
  let cur = w;
  while (!cur.ended) cur = closeTurn(cur, planBots(cur, [...SEATS], difficulty), {}, []);
  return cur;
}
