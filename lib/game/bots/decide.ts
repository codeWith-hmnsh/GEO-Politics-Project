// Utility bots (docs4.0/GAME-DESIGN.md §15). They use the same rules, cards and legality checks as players.
import { CARD_BY_ID, cardCost, cardLegal, suggestCards } from "../engine/cards";
import { CRISIS_BY_ID } from "../engine/events";
import { PROJECTS, projectCost, projectLegal } from "../engine/projects";
import { PROPOSAL_PC } from "../engine/rules";
import { proposalLegal, termsCost, termsValue } from "../engine/treaties";
import type { CountryState, Good, Iso3, Ministry, Proposal, Term, TurnOrders, WorldState } from "../engine/types";
import { GOODS, MINISTRIES, SEATS } from "../engine/types";
import { shuffle } from "../engine/rng";
import { surplus } from "../engine/util";
import { botVote } from "../engine/votes";

export type Difficulty = "easy" | "normal" | "hard";

interface Personality {
  /** Extra score per card group. */
  groups: Partial<Record<string, number>>;
  /** Ministry nudges when healthy. */
  favour: Ministry[];
  /** Likes long contracts and deals. */
  dealmaker: number;
  hawk: number;
}

export const PERSONALITY: Record<Iso3, Personality> = {
  IND: { groups: { people: 6, economy: 4 }, favour: ["infrastructure", "education", "industry"], dealmaker: 1, hawk: 0 },
  CHN: { groups: { energy: 5, economy: 4 }, favour: ["industry", "infrastructure", "energy"], dealmaker: 1.2, hawk: 0.5 },
  USA: { groups: { trade: 2, diplomacy: 5, people: 3 }, favour: ["education", "infrastructure"], dealmaker: 1, hawk: 0.4 },
  RUS: { groups: { energy: 6, diplomacy: 2 }, favour: ["defence", "industry"], dealmaker: 1.2, hawk: 0.8 },
  SAU: { groups: { energy: 6, economy: 3 }, favour: ["industry", "education"], dealmaker: 1, hawk: 0 },
  JPN: { groups: { energy: 5, food: 3 }, favour: ["energy", "education"], dealmaker: 1, hawk: 0 },
};

export interface BotTurn {
  orders: TurnOrders;
  proposals: Omit<Proposal, "id" | "status" | "turn">[];
}

const need = (c: CountryState, g: Good) => Math.max(0, c.goods[g].demand - c.goods[g].prod);

export function decideTurn(w: WorldState, me: Iso3, difficulty: Difficulty, rand: () => number): BotTurn {
  const c = w.countries[me];
  const p = PERSONALITY[me];
  const orders: TurnOrders = {};

  // budget nudges
  const budget: Partial<Record<Ministry, number>> = {};
  const set = (m: Ministry, factor: number) => (budget[m] = Math.max(0, (budget[m] ?? c.budget[m]) * factor));
  if (c.goods.energy.supplyRatio < 0.97 || (w.price.energy >= 110 && need(c, "energy") > 0)) set("energy", 1.1);
  if (c.goods.food.supplyRatio < 0.97) set("agriculture", 1.15);
  if (c.unemployment > c.unemployment0 + 0.5) set("industry", 1.1);
  if (c.stability < 45) set("welfare", 1.08);
  if (c.balancePct < -4 && c.treasury < c.gdp * 0.02) {
    set("welfare", 0.95);
    set("industry", 0.95);
  } else if (c.treasury > c.gdp * 0.05) for (const m of p.favour) set(m, 1.03);
  for (const m of MINISTRIES) if (budget[m] !== undefined) budget[m] = Math.min(budget[m]!, c.baseline[m] * 1.4);
  if (Object.keys(budget).length) orders.budget = budget;

  // a project in a free slot
  if (c.projects.length < c.slots) {
    const pick = PROJECTS.map((pr) => ({ pr, score: projectScore(c, pr.id) }))
      .filter((x) => x.score > 0 && projectLegal(w, me, x.pr.id) === true && projectCost(c, x.pr.id) < c.treasury * 0.6)
      .sort((a, b) => b.score - a.score || a.pr.id.localeCompare(b.pr.id))[0];
    if (pick) orders.projects = [pick.pr.id];
  }

  // cards
  const wantDeal = GOODS.some((g) => need(c, g) > 1 && !hasSupply(w, me, g));
  let pc = c.pc - (wantDeal ? PROPOSAL_PC : 0);
  const candidates = (c.shownCards.length ? c.shownCards : suggestCards(w, me))
    .filter((id) => id !== "diplomacy.proposeDeal")
    .map((id) => {
      const card = CARD_BY_ID.get(id)!;
      const params = card.defaults ? card.defaults(w, me) : {};
      if (params === null) return null;
      if (cardLegal(w, me, id, params) !== true) return null;
      let score = card.relevance(w, me) + (p.groups[card.group] ?? 0);
      if (card.id === "trade.sanction" || card.id === "trade.tariff" || card.id === "diplomacy.pressure") score += 6 * p.hawk - 4;
      return { id, params, score, pc: card.pc, cost: cardCost(w, me, card, params) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const cards: TurnOrders["cards"] = [];
  let money = c.treasury * 0.5;
  const pool = difficulty === "easy" ? candidates.slice(0, 5) : difficulty === "normal" ? candidates.slice(0, 4) : candidates;
  const ordered = difficulty === "easy" ? shuffle(pool, rand) : pool;
  for (const k of ordered) {
    if (k.score < (difficulty === "hard" ? 6 : 8)) continue;
    if (k.pc > pc || k.cost > money) continue;
    if (difficulty === "normal" && rand() < 0.15) continue;
    cards.push({ cardId: k.id, params: k.params });
    pc -= k.pc;
    money -= k.cost;
  }
  if (cards.length) orders.cards = cards;

  // crisis choices: pay to fix when there is money, otherwise the default
  const crisis: Record<string, string> = {};
  for (const id of w.pendingCrises[me] ?? []) {
    const def = CRISIS_BY_ID.get(id);
    if (!def) continue;
    crisis[id] = c.treasury > c.gdp * 0.02 ? def.choices[0].id : def.defaultChoice;
  }
  if (Object.keys(crisis).length) orders.crisis = crisis;

  if (w.vote) orders.vote = botVote(w, me, w.vote);

  // one proposal for the most needed good
  const proposals: BotTurn["proposals"] = [];
  if (wantDeal && c.pc >= PROPOSAL_PC) {
    const g = [...GOODS].filter((x) => need(c, x) > 1 && !hasSupply(w, me, x)).sort((a, b) => need(c, b) * w.price[b] - need(c, a) * w.price[a])[0];
    const supplier = SEATS.filter((s) => s !== me && surplus(w.countries[s], g) > 1 && w.pairs[me][s].relations > -25 && !w.pairs[me][s].sanction && !w.pairs[s][me].sanction && !w.pairs[s][me].embargo.includes(g))
      .sort((a, b) => w.pairs[me][b].relations - w.pairs[me][a].relations || surplus(w.countries[b], g) - surplus(w.countries[a], g))[0];
    if (supplier) {
      const units = Math.max(1, Math.round(Math.min(need(c, g) * 0.5, surplus(w.countries[supplier], g) * 0.4)));
      const turns = p.dealmaker >= 1.2 ? 4 : 3;
      const wants: Term[] = [{ kind: "goods", good: g, units, priceAdj: 0 }];
      const gives: Term[] = [];
      if (w.pairs[me][supplier].tariff > 0) gives.push({ kind: "tariffCut" });
      const v = termsCost(w, supplier, wants, turns) - termsValue(w, supplier, gives, turns);
      if (v > 0) gives.push({ kind: "investment", amount: Math.max(1, Math.round(Math.min(v * 1.1, c.treasury * 0.15, c.gdp * 0.003))) });
      const draft = { from: me, to: supplier, gives, wants, turns };
      if (proposalLegal(w, draft) === true) proposals.push(draft);
    }
  }
  if (proposals.length) orders.proposalsSent = proposals.length;
  return { orders, proposals };
}

function hasSupply(w: WorldState, me: Iso3, g: Good) {
  return w.treaties.some((t) => (t.b === me && t.aGives.some((x) => x.kind === "goods" && x.good === g)) || (t.a === me && t.bGives.some((x) => x.kind === "goods" && x.good === g)));
}

function projectScore(c: CountryState, id: string): number {
  const e = need(c, "energy") / c.goods.energy.demand;
  const f = need(c, "food") / c.goods.food.demand;
  const t = need(c, "tech") / c.goods.tech.demand;
  switch (id) {
    case "oilReserve":
      return e > 0.2 && c.goods.energy.reserve < c.goods.energy.demand * 0.3 ? 30 : 0;
    case "refinery":
      return e * 50;
    case "solar":
      return e * 45 + 5;
    case "nuclear":
      return e * 60 - 5;
    case "irrigation":
      return f * 80 + (c.goods.food.supplyRatio < 1 ? 15 : 0);
    case "fab":
      return t * 60;
    case "industrialCorridor":
      return Math.max(0, c.unemployment - 4) * 6 + Math.max(0, 70 - c.industry) * 0.4;
    case "apprenticeships":
      return Math.max(0, c.unemployment - 5) * 5;
    case "universities":
      return Math.max(0, 70 - c.skills) * 0.8;
    case "hospitals":
      return Math.max(0, 70 - c.health) * 0.8 + Math.max(0, 50 - c.stability) * 0.5;
    case "corridor":
      return Math.max(0, 75 - c.infrastructure) * 0.6;
    case "port":
      return c.tradeCapacity < 45 ? 15 : 0;
    case "financialCentre":
      return (c.debt / c.gdp) * 100 > 80 ? 12 : 0;
    case "navalBase":
      return e > 0.3 ? 10 : 0;
    case "airDefence":
      return c.military < 55 ? 8 : 0;
    default:
      return 0;
  }
}

export type Answer = { status: "accepted" | "rejected" } | { status: "countered"; counter: Omit<Proposal, "id" | "status" | "turn"> };

/** A bot answers a proposal addressed to it (GAME-DESIGN §8.2). */
export function answerProposal(w: WorldState, p: Pick<Proposal, "from" | "to" | "gives" | "wants" | "turns" | "parentId">): Answer {
  const me = p.to;
  const gain = termsValue(w, me, p.gives, p.turns);
  const cost = termsCost(w, me, p.wants, p.turns);
  const relBonus = (w.pairs[me][p.from].relations / 100) * 0.1 * Math.max(gain, cost, 1);
  const net = gain - cost + relBonus;
  const scale = Math.max(1, gain + cost);
  const trust = w.pairs[me][p.from].trust;
  if (net >= 0 && trust >= 30) return { status: "accepted" };
  if (p.parentId || trust < 20 || net / scale < -0.4) return { status: "rejected" };
  // counter once: ask for a better price, fewer units or more money
  const wants = p.wants.map((t) => (t.kind === "goods" ? { ...t, units: Math.max(1, Math.round(t.units * 0.75)) } : t));
  const gives = p.gives.map((t) => (t.kind === "goods" ? { ...t, priceAdj: Math.min(0.3, t.priceAdj + 0.05) } : t.kind === "investment" || t.kind === "money" ? { ...t, amount: Math.round(t.amount * 1.3 + 1) } : t));
  if (!gives.some((t) => t.kind === "investment" || t.kind === "money") && cost - gain > 0) gives.push({ kind: "investment", amount: Math.max(1, Math.round((cost - gain) * 0.6)) });
  return { status: "countered", counter: { from: p.from, to: p.to, gives, wants, turns: p.turns, parentId: "counter" } };
}

/** The proposer (a bot) decides on a counter it received. */
export function acceptsCounter(w: WorldState, p: Pick<Proposal, "from" | "to" | "gives" | "wants" | "turns">): boolean {
  const gain = termsValue(w, p.from, p.wants, p.turns);
  const cost = termsCost(w, p.from, p.gives, p.turns);
  return gain - cost >= -0.1 * Math.max(1, gain);
}
