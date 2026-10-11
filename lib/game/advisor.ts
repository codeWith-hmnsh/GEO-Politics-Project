// The advisor: one clear goal for the year and three recommended moves, each with its forecast effect.
// This is what makes a first turn obvious: read the goal, tap a move, lock.
import { projectScore } from "./bots/decide";
import { CARD_BY_ID, cardCost, cardLegal } from "./engine/cards";
import { PROJECT_BY_ID, projectCost, projectLegal } from "./engine/projects";
import { resolveTurn } from "./engine/resolve";
import { MISSIONS, powerIndex, dimensions } from "./engine/score";
import { termsCost, termsValue } from "./engine/treaties";
import type { CardParams, Good, Iso3, Proposal, Term, TurnOrders, WorldState } from "./engine/types";
import { GOODS, SEATS } from "./engine/types";
import { GOOD_WORD, SHORT, cap, money } from "./text";

export interface Goal {
  id: "energy" | "food" | "tech" | "jobs" | "prices" | "stability" | "budget" | "oilShock" | "mission";
  title: string;
  detail: string;
  metric?: { label: string; now: number; target: number; unit: string; lowerIsBetter?: boolean };
}

export function yearGoal(w: WorldState, me: Iso3): Goal {
  const c = w.countries[me];
  const list: (Goal & { sev: number })[] = [];
  for (const g of GOODS) {
    const r = c.goods[g].supplyRatio;
    if (r < 0.97)
      list.push({
        id: g,
        sev: (1 - r) * 300,
        title: `Secure ${GOOD_WORD[g]}`,
        detail: `Your country gets only ${Math.round(r * 100)}% of the ${GOOD_WORD[g]} it needs. Shortages slow factories and anger voters.`,
        metric: { label: `${cap(GOOD_WORD[g])} supply`, now: r * 100, target: 100, unit: "%" },
      });
  }
  if (c.unemployment - c.unemployment0 > 0.3)
    list.push({ id: "jobs", sev: (c.unemployment - c.unemployment0) * 25, title: "Create jobs", detail: `Unemployment rose to ${c.unemployment.toFixed(1)}%. People need work.`, metric: { label: "Unemployment", now: c.unemployment, target: c.unemployment0, unit: "%", lowerIsBetter: true } });
  if (c.inflation > 6) list.push({ id: "prices", sev: (c.inflation - 6) * 8, title: "Bring prices down", detail: `Inflation is ${c.inflation.toFixed(1)}%. Families feel it every week.`, metric: { label: "Inflation", now: c.inflation, target: 5, unit: "%", lowerIsBetter: true } });
  if (c.stability < 50) list.push({ id: "stability", sev: (50 - c.stability) * 2, title: "Calm the streets", detail: `Stability is ${c.stability.toFixed(0)}. Below 30, protests cost you moves.`, metric: { label: "Stability", now: c.stability, target: 55, unit: "" } });
  if (c.balancePct < -4 && c.treasury < c.gdp * 0.02) list.push({ id: "budget", sev: 25, title: "Fix the budget", detail: `You spend ${(-c.balancePct).toFixed(1)}% of GDP more than you earn and the treasury is nearly empty.`, metric: { label: "Treasury", now: c.treasury, target: c.gdp * 0.02, unit: "$B" } });
  const energyImport = c.goods.energy.demand - c.goods.energy.prod;
  if (w.price.energy >= 110 && energyImport > 0) {
    const covered = Math.min(100, (contracted(w, me, "energy") / energyImport) * 100);
    if (covered < 50)
      list.push({ id: "oilShock", sev: (w.price.energy - 100) * 1.2, title: "Cushion the oil shock", detail: `Oil costs ${Math.round(w.price.energy - 100)}% more than normal and you import ${Math.round((energyImport / c.goods.energy.demand) * 100)}% of your energy. A long contract fixes the price; home production cuts the need.`, metric: { label: "Energy imports under contract", now: covered, target: 50, unit: "%" } });
  }
  const top = list.sort((a, b) => b.sev - a.sev)[0];
  if (top) {
    const { sev, ...g } = top;
    void sev;
    return g;
  }
  const p = MISSIONS[me].progress(w, c);
  return { id: "mission", title: "Work on your mission", detail: MISSIONS[me].text, metric: { label: "Mission", now: p * 100, target: 100, unit: "%" } };
}

/** Goods units a seat receives each year under its treaties. */
export function contracted(w: WorldState, me: Iso3, g: Good): number {
  let u = 0;
  for (const t of w.treaties) {
    const terms = t.b === me ? t.aGives : t.a === me ? t.bGives : [];
    for (const x of terms) if (x.kind === "goods" && x.good === g) u += x.units;
  }
  return u;
}

export type Recommendation =
  | { kind: "card"; id: string; params: CardParams; title: string; why: string; effect: string; cost: string; score: number }
  | { kind: "project"; id: string; title: string; why: string; effect: string; cost: string; score: number }
  | { kind: "deal"; to: Iso3; gives: Term[]; wants: Term[]; turns: number; title: string; why: string; effect: string; cost: string; score: number };

interface Snap {
  growth: number;
  unemployment: number;
  inflation: number;
  stability: number;
  energy: number;
  food: number;
  tech: number;
  power: number;
  treasury: number;
}

function snap(w: WorldState, me: Iso3): Snap {
  const c = w.countries[me];
  return {
    growth: c.growth,
    unemployment: c.unemployment,
    inflation: c.inflation,
    stability: c.stability,
    energy: c.goods.energy.supplyRatio * 100,
    food: c.goods.food.supplyRatio * 100,
    tech: c.goods.tech.supplyRatio * 100,
    power: powerIndex(dimensions(w, me)),
    treasury: c.treasury,
  };
}

const forecastWith = (w: WorldState, me: Iso3, orders: TurnOrders, proposals: Proposal[]) => snap(resolveTurn(w, { [me]: orders }, proposals, { forecast: true }), me);

/** The biggest helpful change between two forecasts, as a short phrase. */
function bestEffect(base: Snap, next: Snap, goal: Goal): { text: string; score: number } {
  const d = {
    energy: next.energy - base.energy,
    food: next.food - base.food,
    tech: next.tech - base.tech,
    growth: next.growth - base.growth,
    unemployment: base.unemployment - next.unemployment,
    inflation: base.inflation - next.inflation,
    stability: next.stability - base.stability,
    power: next.power - base.power,
  };
  const weight: Record<keyof typeof d, number> = { energy: 0.6, food: 0.6, tech: 0.4, growth: 5, unemployment: 6, inflation: 3, stability: 0.8, power: 4 };
  const goalKey: Partial<Record<Goal["id"], keyof typeof d>> = { energy: "energy", food: "food", tech: "tech", jobs: "unemployment", prices: "inflation", stability: "stability", oilShock: "growth" };
  const gk = goalKey[goal.id];
  let best: keyof typeof d = "power";
  let bestV = -Infinity;
  for (const k of Object.keys(d) as (keyof typeof d)[]) {
    const v = d[k] * weight[k] * (k === gk ? 2.5 : 1);
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  }
  const val = d[best];
  const text =
    best === "energy" || best === "food" || best === "tech"
      ? `${cap(GOOD_WORD[best])} supply +${val.toFixed(0)} pts next year`
      : best === "growth"
        ? `Growth +${val.toFixed(1)} pts next year`
        : best === "unemployment"
          ? `Unemployment −${val.toFixed(1)} pts next year`
          : best === "inflation"
            ? `Inflation −${val.toFixed(1)} pts next year`
            : best === "stability"
              ? `Stability +${val.toFixed(0)} next year`
              : `Power index +${val.toFixed(1)} next year`;
  return { text: val > 0.04 ? text : "Small effect next year", score: bestV };
}

/** A fair deal for the most needed good from the friendliest supplier. Shared by the advisor and the Deals tab. */
export function suggestDeal(w: WorldState, me: Iso3): { to: Iso3; good: Good; gives: Term[]; wants: Term[]; turns: number } | null {
  const c = w.countries[me];
  const need = (g: Good) => Math.max(0, c.goods[g].demand - c.goods[g].prod);
  const has = (g: Good) => w.treaties.some((t) => (t.b === me && t.aGives.some((x) => x.kind === "goods" && x.good === g)) || (t.a === me && t.bGives.some((x) => x.kind === "goods" && x.good === g)));
  const g = [...GOODS].filter((x) => need(x) > 1 && !has(x)).sort((a, b) => need(b) * w.price[b] - need(a) * w.price[a])[0];
  if (!g) return null;
  const sup = SEATS.filter((s) => s !== me && w.countries[s].goods[g].prod - w.countries[s].goods[g].demand > 1 && !w.pairs[me][s].sanction && !w.pairs[s][me].sanction && !w.pairs[s][me].embargo.includes(g))
    .sort((a, b) => w.pairs[me][b].relations - w.pairs[me][a].relations)[0];
  if (!sup) return null;
  const surplus = w.countries[sup].goods[g].prod - w.countries[sup].goods[g].demand;
  const units = Math.max(1, Math.round(Math.min(need(g) * 0.5, surplus * 0.4)));
  const wants: Term[] = [{ kind: "goods", good: g, units, priceAdj: 0 }];
  const gap = termsCost(w, sup, wants, 3) - termsValue(w, sup, [], 3);
  const gives: Term[] = gap > 0 ? [{ kind: "investment", amount: Math.max(1, Math.round(Math.min(gap * 1.15, c.treasury * 0.2, c.gdp * 0.003))) }] : [];
  return { to: sup, good: g, gives, wants, turns: 3 };
}

export function recommend(w: WorldState, me: Iso3, orders: TurnOrders, proposals: Proposal[], goal: Goal): Recommendation[] {
  const c = w.countries[me];
  const accepted = proposals.filter((p) => p.status === "accepted");
  const base = forecastWith(w, me, orders, accepted);
  const played = new Set((orders.cards ?? []).map((x) => x.cardId));
  const pcUsed = (orders.cards ?? []).reduce((t, k) => t + (CARD_BY_ID.get(k.cardId)?.pc ?? 0), 0) + (orders.proposalsSent ?? 0);
  const pcLeft = c.pc - pcUsed;
  const out: Recommendation[] = [];

  for (const id of c.shownCards) {
    if (id === "diplomacy.proposeDeal" || played.has(id)) continue;
    const card = CARD_BY_ID.get(id)!;
    if (card.pc > pcLeft) continue;
    const params = card.defaults ? card.defaults(w, me) : {};
    if (params === null || cardLegal(w, me, id, params) !== true) continue;
    const next = forecastWith(w, me, { ...orders, cards: [...(orders.cards ?? []), { cardId: id, params }] }, accepted);
    const e = bestEffect(base, next, goal);
    const cost = cardCost(w, me, card, params);
    const target = params.target ? ` → ${SHORT[params.target]}` : "";
    out.push({ kind: "card", id, params, title: card.name + target, why: card.summary, effect: e.text, cost: `${card.pc} move${card.pc === 1 ? "" : "s"}${cost ? ` · ${money(cost)}` : ""}`, score: e.score + card.relevance(w, me) * 0.05 });
  }

  const starting = orders.projects ?? [];
  if (c.projects.length + starting.length < c.slots) {
    const pick = [...PROJECT_BY_ID.values()]
      .map((p) => ({ p, s: projectScore(c, p.id) }))
      .filter((x) => x.s > 5 && !starting.includes(x.p.id) && projectLegal(w, me, x.p.id) === true && projectCost(c, x.p.id) < c.treasury * 0.7)
      .sort((a, b) => b.s - a.s)[0];
    if (pick) out.push({ kind: "project", id: pick.p.id, title: `Build: ${pick.p.name}`, why: pick.p.capability, effect: `Ready in ${pick.p.turns} year${pick.p.turns > 1 ? "s" : ""}`, cost: `${money(projectCost(c, pick.p.id))} over ${pick.p.turns} yr`, score: pick.s * 0.6 });
  }

  const deal = pcLeft >= 1 && !proposals.some((p) => p.from === me) ? suggestDeal(w, me) : null;
  if (deal) {
    const p: Proposal = { id: "advisor", turn: w.turn, from: me, to: deal.to, gives: deal.gives, wants: deal.wants, turns: deal.turns, status: "accepted" };
    const next = forecastWith(w, me, { ...orders, proposalsSent: (orders.proposalsSent ?? 0) + 1 }, [...accepted, p]);
    const e = bestEffect(base, next, goal);
    const units = deal.wants[0]?.kind === "goods" ? deal.wants[0].units : 0;
    const need = Math.max(1, c.goods[deal.good].demand - c.goods[deal.good].prod);
    const locks = `Locks ${Math.min(100, Math.round((units / need) * 100))}% of your ${GOOD_WORD[deal.good]} imports at today's price for ${deal.turns} years`;
    const priceGoal = goal.id === "oilShock" && deal.good === "energy";
    out.push({ kind: "deal", to: deal.to, gives: deal.gives, wants: deal.wants, turns: deal.turns, title: `Deal: ${GOOD_WORD[deal.good]} from ${SHORT[deal.to]}`, why: `${SHORT[deal.to]} has spare ${GOOD_WORD[deal.good]}. You offer ${deal.gives.map((t) => (t.kind === "investment" ? `${money(t.amount)} of investment` : "a fair price")).join(", ") || "a fair price"}.`, effect: priceGoal || e.score < 1 ? locks : `${e.text} if they agree`, cost: "1 move", score: e.score + (priceGoal ? 40 : 4) });
  }

  // three moves, at most two cards, best first
  const sorted = out.sort((a, b) => b.score - a.score);
  const picked: Recommendation[] = [];
  for (const r of sorted) {
    if (picked.length >= 3) break;
    if (r.kind === "card" && picked.filter((x) => x.kind === "card").length >= 2) continue;
    picked.push(r);
  }
  return picked;
}
