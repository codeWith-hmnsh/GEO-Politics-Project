// The resolve phases, in the fixed order of docs4.0/SYSTEMS.md §10.
import { CARD_BY_ID, cardCost, cardLegal, sanctionStrength } from "./cards";
import type { Ctx } from "./ctx";
import { CRISIS_BY_ID, EVENT_BY_ID } from "./events";
import { PROJECT_BY_ID, projectLegal } from "./projects";
import { REGION_DEFS } from "./regions";
import {
  EVENT_TURNS,
  INTEREST,
  MINISTRY_SPEED,
  OKUN,
  PRICE_ELASTICITY,
  REGION,
  RELATIONS,
  SHORTAGE_GROWTH,
  STABILITY_SPEED,
  TAX_MAX,
  TAX_MIN,
  TENSION,
  UNIT_VALUE,
  UNREST_BELOW,
  CRISIS_BELOW,
  VOTE_PASS,
  PROPOSAL_PC,
} from "./rules";
import { ageTreaties, checkPledges, rel, signTreaties } from "./treaties";
import type { Good, Iso3, Rating, RegionId } from "./types";
import { GOODS, MINISTRIES, RATINGS, REGIONS, SEATS } from "./types";
import { clamp, debtPct } from "./util";
import { RESOLUTION_BY_ID } from "./votes";

// ───────── 1. Validate + 2. Treaties ─────────

export function phaseTreaties(ctx: Ctx) {
  signTreaties(ctx);
}

// ───────── 3. Budget and tax ─────────

export function phaseBudget(ctx: Ctx) {
  for (const s of SEATS) {
    const c = ctx.w.countries[s];
    const o = ctx.orders[s] ?? {};
    const prevDeficit = ctx.start.countries[s].deficitPct;
    const root = ctx.causes.add(s, "budget", 0, "budget", { actor: s });

    if (o.taxRate !== undefined) {
      const t = clamp(o.taxRate, TAX_MIN, TAX_MAX);
      const d = t - c.taxRate;
      if (d !== 0) {
        c.taxRate = t;
        if (d > 0) ctx.mod(s, "stability", -0.8 * d, "budget.taxUp", { actor: s, parent: root });
        if (t > 30) ctx.mod(s, "growth", -0.05 * (t - 30), "budget.highTax", { actor: s, parent: root });
      }
    }
    if (o.budget) {
      for (const m of MINISTRIES) {
        const v = o.budget[m];
        if (v === undefined || !Number.isFinite(v)) continue;
        let cap = c.baseline[m] * 3;
        if (c.imfTurnsLeft > 0 && (m === "welfare" || m === "defence")) cap = c.baseline[m];
        c.budget[m] = clamp(v, 0, cap);
      }
    } else if (c.imfTurnsLeft > 0) {
      c.budget.welfare = Math.min(c.budget.welfare, c.baseline.welfare);
      c.budget.defence = Math.min(c.budget.defence, c.baseline.defence);
    }

    const revenue = (c.gdp * c.taxRate) / 100;
    const rate = INTEREST[c.rating] - (c.flags.includes("financialCentre") ? 1 : 0);
    const interest = (c.debt * rate * (c.debtSavingsFactor < 1 ? c.debtSavingsFactor : 1)) / 100;
    const ministrySpend = (c.gdp * MINISTRIES.reduce((t, m) => t + c.budget[m], 0)) / 100;
    c.treasury += revenue - ministrySpend - interest;
    ctx.causes.add(s, "treasury", revenue, "budget.revenue", { actor: s, parent: root });
    ctx.causes.add(s, "treasury", -ministrySpend, "budget.ministries", { actor: s, parent: root });
    ctx.causes.add(s, "treasury", -interest, "budget.interest", { actor: s, parent: root });
    c.deficitPct = ((ministrySpend + interest - revenue) / c.gdp) * 100;
    ctx.s[s].fiscalImpulse = c.deficitPct - prevDeficit;

    for (const m of MINISTRIES) {
      const ratio = Math.max(0.05, c.budget[m] / c.baseline[m]);
      const target = clamp(50 + 25 * Math.log2(ratio));
      const before = c.index[m];
      c.index[m] = before + (target - before) * MINISTRY_SPEED[m];
      const changed = c.budget[m] - ctx.start.countries[s].budget[m];
      if (Math.abs(changed) > 0.001) ctx.causes.add(s, `index.${m}`, c.index[m] - before, `budget.${m}`, { actor: s, parent: root });
    }
    if (c.imfTurnsLeft > 0) c.imfTurnsLeft--;
  }
}

// ───────── 4. Projects ─────────

export function phaseProjects(ctx: Ctx) {
  for (const s of SEATS) {
    const c = ctx.w.countries[s];
    // progress active projects
    for (const a of c.projects) {
      const def = PROJECT_BY_ID.get(a.id)!;
      const inst = (c.gdp * def.costPct) / 100 / def.turns;
      if (c.treasury >= inst) {
        c.treasury -= inst;
        c.deficitPct += (inst / c.gdp) * 100;
        a.turnsLeft--;
        a.paused = false;
      } else a.paused = true;
    }
    // start new ones
    for (const id of ctx.orders[s]?.projects ?? []) {
      const ok = projectLegal(ctx.w, s, id);
      if (ok !== true) {
        ctx.dropped.push({ iso3: s, reason: `${PROJECT_BY_ID.get(id)?.name ?? id}: ${ok}` });
        continue;
      }
      const def = PROJECT_BY_ID.get(id)!;
      const inst = (c.gdp * def.costPct) / 100 / def.turns;
      c.treasury -= inst;
      c.deficitPct += (inst / c.gdp) * 100;
      c.projects.push({ id, turnsLeft: def.turns - 1, paused: false });
      ctx.causes.add(s, "treasury", -inst, `project.start.${id}`, { actor: s });
      ctx.setMove(s, `Starts ${def.name}`);
      ctx.globe.push({ kind: "project", from: s, label: def.name });
    }
    for (const a of c.projects.filter((p) => p.turnsLeft <= 0)) {
      const def = PROJECT_BY_ID.get(a.id)!;
      const root = ctx.causes.add(s, "project", 1, `project.${a.id}`, { actor: s, sourceRef: a.id });
      def.complete(ctx, s, root);
      c.completed.push(a.id);
      ctx.completed.push({ iso3: s, projectId: a.id });
      ctx.addNews({ headline: `${c.name} completes its ${def.name}`, icon: "project", iso3: s, weight: 3 });
    }
    c.projects = c.projects.filter((p) => p.turnsLeft > 0);
  }
}

// ───────── 5. Cards ─────────

export function phaseCards(ctx: Ctx) {
  for (const s of SEATS) {
    const c = ctx.w.countries[s];
    const o = ctx.orders[s] ?? {};
    let pc = ctx.start.countries[s].pc - (o.proposalsSent ?? 0) * PROPOSAL_PC;
    ctx.s[s].pcSpent = (o.proposalsSent ?? 0) * PROPOSAL_PC;
    const played: string[] = [];
    for (const pcard of o.cards ?? []) {
      const card = CARD_BY_ID.get(pcard.cardId);
      if (!card || card.id === "diplomacy.proposeDeal") continue;
      const startCheck = { ...ctx.start, countries: { ...ctx.start.countries, [s]: { ...ctx.start.countries[s], pc, treasury: c.treasury } } };
      const ok = cardLegal(startCheck, s, card.id, pcard.params);
      if (ok !== true) {
        ctx.dropped.push({ iso3: s, reason: `${card.name}: ${ok}` });
        continue;
      }
      const cost = cardCost(ctx.w, s, card, pcard.params);
      if (cost > 0 && card.id !== "diplomacy.foreignAid") {
        c.treasury -= cost;
        ctx.causes.add(s, "treasury", -cost, `card.cost.${card.id}`, { actor: s });
      }
      pc -= card.pc;
      ctx.s[s].pcSpent += card.pc;
      const root = ctx.causes.add(s, "move", 1, card.id, { actor: s, sourceRef: card.id });
      card.apply(ctx, s, pcard.params, root);
      ctx.setMove(s, card.name);
      played.push(card.id);
    }
    c.lastCards = played;
  }
  checkPledges(ctx);
}

// ───────── 6. Crisis choices, active resolutions, World Vote, world event ─────────

export function phaseWorld(ctx: Ctx) {
  const { w } = ctx;
  // crisis choices
  for (const s of SEATS) {
    for (const id of w.pendingCrises[s] ?? []) {
      const def = CRISIS_BY_ID.get(id);
      if (!def) continue;
      const choiceId = ctx.orders[s]?.crisis?.[id] ?? def.defaultChoice;
      const choice = def.choices.find((x) => x.id === choiceId) ?? def.choices.find((x) => x.id === def.defaultChoice)!;
      const root = ctx.causes.add(s, "crisis", 1, `crisis.${id}.${choice.id}`, { actor: s });
      choice.apply(ctx, s, root);
    }
  }
  w.pendingCrises = {};

  // active resolutions (passed on earlier turns)
  for (const r of w.resolutions) RESOLUTION_BY_ID.get(r.resolutionId)?.each?.(ctx, r.target);
  for (const r of w.resolutions) r.turnsLeft--;
  w.resolutions = w.resolutions.filter((r) => r.turnsLeft > 0);

  // this turn's World Vote
  if (w.vote) {
    const v = w.vote;
    for (const s of SEATS) v.votes[s] = ctx.orders[s]?.vote ?? v.votes[s] ?? "abstain";
    const yes = SEATS.filter((s) => v.votes[s] === "yes");
    const no = SEATS.filter((s) => v.votes[s] === "no");
    v.passed = yes.length >= VOTE_PASS;
    const def = RESOLUTION_BY_ID.get(v.resolutionId)!;
    for (const a of SEATS)
      for (const b of SEATS) {
        if (a >= b) continue;
        if (v.votes[a] !== "abstain" && v.votes[a] === v.votes[b]) {
          rel(w, a, b, 4);
          rel(w, b, a, 4);
        }
        if ((yes.includes(a) && no.includes(b)) || (no.includes(a) && yes.includes(b))) {
          rel(w, a, b, -3);
          rel(w, b, a, -3);
        }
      }
    if (v.passed) {
      def.onPass?.(ctx, v.target);
      w.resolutions.push({ resolutionId: v.resolutionId, target: v.target, turnsLeft: 3 });
      for (const s of yes) for (const r of def.serves) ctx.s[s].swayAdd[r] = (ctx.s[s].swayAdd[r] ?? 0) + REGION.vote;
    }
    ctx.addNews({
      headline: `World Vote: "${def.title(v.target, w)}" ${v.passed ? "passes" : "fails"} ${yes.length}–${no.length}`,
      icon: "vote",
      weight: 7,
    });
  }

  // world event
  const idx = EVENT_TURNS.indexOf(w.turn);
  if (!ctx.forecastOnly && idx >= 0 && w.eventDeck[idx]) {
    const ev = EVENT_BY_ID.get(w.eventDeck[idx])!;
    ctx.eventId = ev.id;
    const root = ctx.causes.add(SEATS[0], "event", 1, `event.${ev.id}`, { actor: "event", sourceRef: ev.id });
    const hit = ev.apply(ctx, root);
    for (const s of hit) w.pendingCrises[s] = [...(w.pendingCrises[s] ?? []), ev.id];
    ctx.addNews({ headline: ev.title, icon: ev.group === "general" ? "disaster" : (ev.group as "energy" | "food" | "trade"), place: ev.place, weight: 9 });
    ctx.globe.push({ kind: "event", label: ev.title });
  }
}

// ───────── 7. Goods ─────────

interface Flow {
  avail: Record<Good, number>;
  dem: Record<Good, number>;
  got: Record<Good, number>; // supplied to the home market so far
  sold: Record<Good, number>;
  cap: number;
  supplyCause: Partial<Record<Good, string>>;
}

export function phaseGoods(ctx: Ctx) {
  const { w, start } = ctx;
  const f = {} as Record<Iso3, Flow>;

  // production and demand
  for (const s of SEATS) {
    const c = w.countries[s];
    const sc = start.countries[s];
    const pcg = sc.growth - sc.popGrowth;
    const eff = {
      energy: 0.001 * (c.index.energy - 50),
      food: 0.0015 * (c.index.agriculture - 50),
      tech: 0.001 * (c.industry - c.ref.industry) + 0.001 * (c.index.industry - 50),
    } as Record<Good, number>;
    const demGrowth = { energy: (0.6 * sc.growth) / 100, food: sc.popGrowth / 100 + (0.2 * pcg) / 100, tech: (0.8 * sc.growth) / 100 } as Record<Good, number>;
    for (const g of GOODS) {
      const gs = c.goods[g];
      const before = gs.prod;
      gs.prod *= 1 + c.prodGrowth[g] + eff[g];
      if (Math.abs(eff[g]) > 0.0005) ctx.causes.add(s, `${g}.prod`, gs.prod - before * (1 + c.prodGrowth[g]), `goods.ministry.${g}`, { actor: s });
      gs.demand *= 1 + demGrowth[g];
    }
    f[s] = {
      avail: Object.fromEntries(GOODS.map((g) => [g, c.goods[g].prod * ctx.s[s].prodShock[g]])) as Record<Good, number>,
      dem: Object.fromEntries(GOODS.map((g) => [g, c.goods[g].demand * ctx.s[s].demandShock[g]])) as Record<Good, number>,
      got: { energy: 0, food: 0, tech: 0 },
      sold: { energy: 0, food: 0, tech: 0 },
      cap: c.tradeCapacity * ctx.s[s].tradeCapShock,
      supplyCause: {},
    };
    for (const g of GOODS) f[s].got[g] = Math.min(f[s].avail[g], f[s].dem[g]);
  }
  const spare = (s: Iso3, g: Good) => f[s].avail[g] - f[s].got[g] - f[s].sold[g];

  // the rest of the world grows too
  for (const g of GOODS) {
    // other producers respond to price: high prices bring more supply, low prices less
    w.market[g].baseSupply *= 1.022 + 0.006 * (start.price[g] - 100);
    w.market[g].baseDemand *= 1.022;
  }

  // prices from world totals
  const discountOf = (s: Iso3) => Math.min(REGION.discountCap, REGION.discountPer * REGIONS.filter((r) => w.regions[r].leader === s).length) / 100;
  for (const g of GOODS) {
    const m = w.market[g];
    const supply = SEATS.reduce((t, s) => t + f[s].avail[g], 0) + m.baseSupply * (1 + m.shock + ctx.world.marketShock[g]);
    const demand = SEATS.reduce((t, s) => t + f[s].dem[g], 0) + m.baseDemand;
    const target = 100 * Math.pow(demand / supply, PRICE_ELASTICITY[g]);
    let p = 0.5 * start.price[g] + 0.5 * target;
    if (g === "energy" && w.resolutions.some((r) => r.resolutionId === "oilPriceCap")) p = Math.min(p, 115);
    w.price[g] = clamp(p, 40, 300);
  }

  const pay = (buyer: Iso3, seller: Iso3 | "market", g: Good, units: number, priceIdx: number, cause: string) => {
    const value = (units * UNIT_VALUE[g] * priceIdx) / 100;
    ctx.s[buyer].importValue += value;
    const tariff = seller !== "market" ? w.pairs[buyer][seller].tariff : 0;
    if (tariff > 0) {
      ctx.s[buyer].tariffRevenue += (value * tariff) / 100;
      ctx.s[buyer].tariffInflation += 0.02 * tariff * (units / Math.max(1, f[buyer].dem[g]));
    }
    if (seller !== "market") {
      const sv = value * (1 - 0.2 * sanctionStrength(start, seller, buyer));
      ctx.s[seller].exportValue += sv;
    }
    return cause;
  };

  // 7a. treaties
  for (const t of w.treaties) {
    for (const [seller, buyer, terms] of [
      [t.a, t.b, t.aGives],
      [t.b, t.a, t.bGives],
    ] as const) {
      for (const term of terms) {
        if (term.kind !== "goods") continue;
        const g = term.good;
        const flowCause = ctx.causes.add(buyer, "treaty", 0, "treaty.flow", { actor: seller, sourceRef: t.id });
        let units = Math.min(term.units, Math.max(0, f[seller].avail[g] - f[seller].dem[g] * 0.9 - f[seller].sold[g]), f[seller].cap, f[buyer].cap);
        const overSpare = Math.max(0, units - Math.max(0, spare(seller, g)));
        const strength = sanctionStrength(start, seller, buyer);
        const delayed = units * 0.2 * strength;
        units -= delayed;
        if (units <= 0) continue;
        f[seller].cap -= units;
        f[buyer].cap -= units;
        f[seller].sold[g] += units;
        f[seller].got[g] -= Math.min(overSpare, units); // a contract can cut into the seller's own supply
        const need = Math.max(0, f[buyer].dem[g] - f[buyer].got[g]);
        const used = Math.min(units, need);
        f[buyer].got[g] += used;
        const price = (t.prices[g] ?? start.price[g]) * (1 + term.priceAdj);
        pay(buyer, seller, g, units, price, flowCause);
        const id = ctx.causes.add(buyer, `${g}.supply`, (used / f[buyer].dem[g]) * 100, "treaty.supply", { actor: seller, sourceRef: t.id, parent: flowCause });
        f[buyer].supplyCause[g] ??= id;
        if (delayed > 0.05) ctx.causes.add(buyer, `${g}.supply`, -(delayed / f[buyer].dem[g]) * 100, "sanctions.delay", { actor: "world", sourceRef: t.id, parent: flowCause });
        ctx.globe.push({ kind: "flow", from: seller, to: buyer, good: g, units: Math.round(units * 10) / 10 });
      }
    }
  }

  // 7b. priority purchases from a named supplier (Secure Oil Imports)
  for (const s of SEATS) {
    for (const pb of ctx.s[s].priority) {
      if (pb.seller === "market") continue;
      const g = pb.good;
      const need = Math.max(0, f[s].dem[g] - f[s].got[g]);
      const units = Math.min(pb.units, need, Math.max(0, spare(pb.seller, g)), f[pb.seller].cap, f[s].cap);
      if (units <= 0) continue;
      f[pb.seller].sold[g] += units;
      f[pb.seller].cap -= units;
      f[s].cap -= units;
      f[s].got[g] += units;
      pay(s, pb.seller, g, units, w.price[g] * pb.premium, pb.causeId);
      const id = ctx.causes.add(s, `${g}.supply`, (units / f[s].dem[g]) * 100, "card.secureImports", { actor: s, parent: pb.causeId });
      f[s].supplyCause[g] ??= id;
      ctx.globe.push({ kind: "flow", from: pb.seller, to: s, good: g, units: Math.round(units * 10) / 10 });
    }
  }

  // 7c. world market
  for (const g of GOODS) {
    const m = w.market[g];
    const baseSupply = m.baseSupply * (1 + m.shock + ctx.world.marketShock[g]);
    const sellers = SEATS.filter((s) => spare(s, g) > 0.01);
    const offers = Object.fromEntries(sellers.map((s) => [s, spare(s, g)])) as Partial<Record<Iso3, number>>;
    const pool = baseSupply + sellers.reduce((t, s) => t + offers[s]!, 0);
    const needs = Object.fromEntries(SEATS.map((s) => [s, Math.max(0, f[s].dem[g] - f[s].got[g])])) as Record<Iso3, number>;
    // priority market buyers first
    let left = pool;
    const prio = SEATS.flatMap((s) => ctx.s[s].priority.filter((p) => p.seller === "market" && p.good === g));
    const prioGot = {} as Partial<Record<Iso3, number>>;
    for (const p of prio) {
      const u = Math.min(p.units, needs[p.buyer], left);
      left -= u;
      needs[p.buyer] -= u;
      prioGot[p.buyer] = (prioGot[p.buyer] ?? 0) + u;
    }
    const claims = m.baseDemand + SEATS.reduce((t, s) => t + needs[s], 0);
    const fill = claims > 0 ? Math.min(1, left / claims) : 1;
    const totalBought = SEATS.reduce((t, s) => t + needs[s] * fill + (prioGot[s] ?? 0), 0) + m.baseDemand * fill;
    const sellShare = pool > 0 ? Math.min(1, totalBought / pool) : 0;
    for (const s of SEATS) {
      const units = needs[s] * fill + (prioGot[s] ?? 0);
      if (units > 0.001) {
        f[s].got[g] += units;
        const embargoers = SEATS.filter((x) => x !== s && w.pairs[x][s].embargo.includes(g));
        const premium = (1 + 0.1 * embargoers.length + 0.15 * sanctionStrength(start, s)) * (1 - discountOf(s)) * (prioGot[s] ? 1.05 : 1);
        ctx.s[s].marketPremium[g] = premium;
        pay(s, "market", g, units, w.price[g] * premium, "");
        const prioCause = ctx.s[s].priority.find((p) => p.seller === "market" && p.good === g)?.causeId;
        const id = ctx.causes.add(s, `${g}.supply`, (units / f[s].dem[g]) * 100, "market.buy", { actor: "market", parent: prioCause });
        f[s].supplyCause[g] ??= id;
        const regions = REGIONS.filter((r) => REGION_DEFS[r].offers.includes(g));
        for (const r of regions) ctx.s[s].tradeWithRegion[r] = (ctx.s[s].tradeWithRegion[r] ?? 0) + units / regions.length;
      }
      const offered = offers[s] ?? 0;
      if (offered > 0) {
        const soldUnits = offered * sellShare;
        f[s].sold[g] += soldUnits;
        const value = (soldUnits * UNIT_VALUE[g] * w.price[g]) / 100;
        ctx.s[s].exportValue += value * (1 - 0.2 * sanctionStrength(start, s));
        const regions = REGIONS.filter((r) => REGION_DEFS[r].needs.includes(g));
        for (const r of regions) ctx.s[s].tradeWithRegion[r] = (ctx.s[s].tradeWithRegion[r] ?? 0) + soldUnits / Math.max(1, regions.length);
      }
    }
  }

  // 7d. reserves, ratios, money
  for (const s of SEATS) {
    const c = w.countries[s];
    for (const g of GOODS) {
      const gs = c.goods[g];
      const short = Math.max(0, f[s].dem[g] - f[s].got[g]);
      if (short > 0 && gs.reserve > 0) {
        const draw = Math.min(gs.reserve, short * (ctx.s[s].releaseReserve[g] ? 1 : 0.5));
        gs.reserve -= draw;
        f[s].got[g] += draw;
        const id = ctx.causes.add(s, `${g}.supply`, (draw / f[s].dem[g]) * 100, "reserve.draw", { actor: s });
        f[s].supplyCause[g] ??= id;
      } else if (short <= 0 && gs.reserve < c.reserveCap[g]) {
        const refill = Math.min(c.reserveCap[g] - gs.reserve, c.reserveCap[g] * 0.1);
        gs.reserve += refill;
        ctx.s[s].importValue += (refill * UNIT_VALUE[g] * w.price[g]) / 100;
      }
      const before = start.countries[s].goods[g].supplyRatio;
      gs.supplyRatio = f[s].dem[g] > 0 ? f[s].got[g] / f[s].dem[g] : 1;
      const id = ctx.causes.add(s, `${g}.supplyRatio`, (gs.supplyRatio - before) * 100, `goods.${g}.supply`, { actor: "market", parent: f[s].supplyCause[g] });
      f[s].supplyCause[g] = id;
    }
    c.importBill = (ctx.s[s].importValue / c.gdp) * 100;
    c.exportEarn = (ctx.s[s].exportValue / c.gdp) * 100;
    const rent = ctx.s[s].exportValue * c.resourceRent + ctx.s[s].tariffRevenue;
    c.treasury += rent;
    c.balancePct = (rent / c.gdp) * 100 - c.deficitPct;
    ctx.causes.add(s, "treasury", ctx.s[s].exportValue * c.resourceRent, "goods.exportRent", { actor: s });
    if (ctx.s[s].tariffRevenue > 0.01) ctx.causes.add(s, "treasury", ctx.s[s].tariffRevenue, "goods.tariffRevenue", { actor: s });
    ctx.s[s].sanctionHit = 1.5 * sanctionStrength(start, s);
    ctx.s[s].supplyCause = f[s].supplyCause;
  }
  ageTreaties(ctx);
}

// ───────── 8. Macro ─────────

/** Constant drags; calibrated into growthBase at the start so only changes move growth. */
export function growthDrags(c: { debt: number; gdp: number; inflation: number }) {
  return 0.02 * Math.max(0, (c.debt / c.gdp) * 100 - 90) + 0.15 * Math.max(0, c.inflation - 6);
}

export function potentialGrowth(c: { growthBase: number; skills: number; infrastructure: number; industry: number; workforceGrowth: number }) {
  return c.growthBase + 0.04 * (c.skills - 50) + 0.03 * (c.infrastructure - 50) + 0.02 * (c.industry - 50) + c.workforceGrowth;
}

export function phaseMacro(ctx: Ctx) {
  const { w, start } = ctx;
  for (const s of SEATS) {
    const c = w.countries[s];
    const sc = start.countries[s];
    const sx = ctx.s[s];
    const add = (v: number, label: string, parent?: string) => {
      if (v !== 0) ctx.causes.add(s, "growth", v, label, { actor: label.startsWith("growth.short") ? "market" : s, parent });
      return v;
    };
    const mods = (k: string) => sx.mods.filter((m) => m.kind === k).reduce((t, m) => t + m.value, 0);

    let g = potentialGrowth(c);
    add(0.04 * (c.skills - sc.skills) + 0.03 * (c.infrastructure - sc.infrastructure) + 0.02 * (c.industry - sc.industry), "growth.potential");
    for (const good of GOODS) {
      const short = Math.max(0, 1 - c.goods[good].supplyRatio);
      g += add(-SHORTAGE_GROWTH[good] * short, `growth.short.${good}`, sx.supplyCause[good]);
    }
    g += add(0.3 * sx.fiscalImpulse, "growth.fiscal");
    g += add(0.3 * (c.exportEarn - c.importBill - (c.exportEarn0 - c.importBill0)), "growth.trade");
    g += add(0.5 * sx.investmentReceivedPct, "growth.investment");
    g -= growthDrags(sc);
    g += add(-sx.sanctionHit, "growth.sanctions");
    if (start.tension >= TENSION.panicAt) g += add(-0.5, "growth.tension");
    if (sc.stability < UNREST_BELOW) g += add(-1, "growth.unrest");
    g += add(start.globalGrowth + ctx.world.globalGrowthAdd, "growth.world");
    g += mods("growth");
    c.growth = clamp(g, -15, 15);
    const growthCause = ctx.causes.add(s, "gdp", c.growth, "macro.growth", { actor: s });
    c.gdp *= 1 + c.growth / 100;

    // people
    c.population *= 1 + c.popGrowth / 100;
    c.workforce *= 1 + c.workforceGrowth / 100;
    const needed = c.productivityTrend + c.workforceGrowth;
    const du = -OKUN * (c.growth - needed) - 0.03 * (c.industry - sc.industry) + mods("unemployment");
    c.unemployment = clamp(c.unemployment + du, Math.max(1.5, 0.6 * c.unemployment0), 30);
    ctx.causes.add(s, "unemployment", -OKUN * (c.growth - needed), "macro.okun", { actor: s, parent: growthCause });

    // inflation
    const eShare = Math.max(0, c.goods.energy.demand - c.goods.energy.prod) / c.goods.energy.demand;
    const fShare = Math.max(0, c.goods.food.demand - c.goods.food.prod) / c.goods.food.demand;
    const energyPush = 0.04 * eShare * (w.price.energy - 100) * (sx.fuelSubsidy ? 0.5 : 1);
    const foodPush = 0.03 * fShare * (w.price.food - 100);
    const anyShort = GOODS.some((x) => c.goods[x].supplyRatio < 0.97) ? 0.5 : 0;
    const welfareOver = c.budget.welfare > 1.5 * c.baseline.welfare ? 0.5 : 0;
    c.inflation = clamp(
      0.5 * sc.inflation + 0.5 * c.inflationAnchor + energyPush + foodPush + 0.4 * Math.max(0, sx.fiscalImpulse) + anyShort + sx.tariffInflation + welfareOver + mods("inflation"),
      -3,
      60,
    );
    ctx.causes.add(s, "inflation", energyPush, "inflation.energy", { actor: "market", parent: sx.supplyCause.energy });
    ctx.causes.add(s, "inflation", foodPush, "inflation.food", { actor: "market", parent: sx.supplyCause.food });

    // skills, health (education has a 3-turn lag)
    c.educationHistory.push(c.index.education);
    const lagged = c.educationHistory.length > 3 ? c.educationHistory[c.educationHistory.length - 4] : 50;
    c.skills = clamp(c.skills + (lagged - 50) * 0.1);
    c.health = clamp(c.health + (c.index.welfare - 50) * 0.06);

    // borrowing and rating
    if (c.treasury < 0) {
      ctx.causes.add(s, "debt", -c.treasury, "macro.borrow", { actor: s });
      c.debt += -c.treasury;
      c.treasury = 0;
    }
    const penalty = c.flags.filter((x) => x === "ratingPenalty").length;
    const points = (debtPct(c) * c.debtSavingsFactor) / 30 - c.growth / 3 - (c.stability - 50) / 25 + c.ratingOffset + penalty;
    const target = clamp(Math.round(points), 0, RATINGS.length - 1);
    const cur = RATINGS.indexOf(c.rating);
    const next = cur + Math.sign(target - cur);
    if (next !== cur) {
      c.rating = RATINGS[next] as Rating;
      ctx.addNews({ headline: `${c.name}'s credit rating ${next > cur ? "cut" : "raised"} to ${c.rating}`, icon: "economy", iso3: s, weight: next > cur ? 5 : 3 });
    }
    c.flags = c.flags.filter((x) => x !== "ratingPenalty");

    // slots
    const ratio = c.gdp / c.gdp0;
    c.slots = ratio >= 1.25 ? 3 : ratio >= 1.1 ? 2 : 1;
  }
}

// ───────── 9. People ─────────

export function phasePeople(ctx: Ctx) {
  const { w, start } = ctx;
  for (const s of SEATS) {
    const c = w.countries[s];
    const sx = ctx.s[s];
    const mods = sx.mods.filter((m) => m.kind === "stability").reduce((t, m) => t + m.value, 0);
    const foodShort = Math.max(0, 1 - c.goods.food.supplyRatio);
    const energyShort = Math.max(0, 1 - c.goods.energy.supplyRatio);
    const target =
      c.stabilityBase -
      1.5 * (c.unemployment - c.unemployment0) -
      1.2 * Math.max(0, c.inflation - Math.max(5, c.inflation0)) +
      0.3 * (c.health - c.health0) -
      15 * foodShort -
      10 * energyShort +
      2 * sx.treatiesKept;
    const before = start.countries[s].stability;
    c.stability = clamp(before + (target - before) * STABILITY_SPEED + mods);
    ctx.causes.add(s, "stability", -1.5 * (c.unemployment - c.unemployment0) * STABILITY_SPEED, "stability.jobs", { actor: s });
    ctx.causes.add(s, "stability", -1.2 * Math.max(0, c.inflation - Math.max(5, c.inflation0)) * STABILITY_SPEED, "stability.prices", { actor: s });
    ctx.causes.add(s, "stability", -(15 * foodShort + 10 * energyShort) * STABILITY_SPEED, "stability.shortages", { actor: "market", parent: sx.supplyCause.food });
    c.flags = c.flags.filter((x) => x !== "unrest" && x !== "govCrisis");
    if (c.stability < CRISIS_BELOW) {
      c.flags.push("govCrisis");
      ctx.addNews({ headline: `Government crisis in ${c.name}`, icon: "unrest", iso3: s, weight: 8 });
    } else if (c.stability < UNREST_BELOW) {
      c.flags.push("unrest");
      ctx.addNews({ headline: `Protests spread across ${c.name}`, icon: "unrest", iso3: s, weight: 6 });
    }
  }
}

// ───────── 10. Diplomacy: relations, sway, influence, tension, military ─────────

export function phaseDiplomacy(ctx: Ctx) {
  const { w, start } = ctx;
  for (const a of SEATS)
    for (const b of SEATS) {
      if (a === b) continue;
      const p = w.pairs[a][b];
      p.relations = clamp(p.base + (p.relations - p.base) * 0.95 + (p.sanction ? RELATIONS.sanctionPerTurn : 0), -100, 100);
    }

  // partner regions
  for (const r of REGIONS) {
    const reg = w.regions[r];
    for (const s of SEATS) {
      const sx = ctx.s[s];
      reg.sway[s] = Math.max(
        0,
        reg.sway[s] * REGION.fade +
          REGION.perUnit * (sx.tradeWithRegion[r] ?? 0) +
          REGION.perAidPct * (sx.aidToRegion[r] ?? 0) +
          (sx.swayAdd[r] ?? 0) -
          (sx.regionPenalty[r] ?? 0),
      );
    }
    const total = SEATS.reduce((t, s) => t + reg.sway[s], 0);
    if (total > 100) for (const s of SEATS) reg.sway[s] *= 100 / total;
    const top = [...SEATS].sort((x, y) => reg.sway[y] - reg.sway[x] || x.localeCompare(y))[0];
    const prev = reg.leader;
    let leader: Iso3 | null = reg.sway[top] >= REGION.leadMin ? top : null;
    if (prev && leader && reg.sway[prev] === reg.sway[leader]) leader = prev;
    reg.leader = leader;
    if (leader !== prev && leader) {
      ctx.addNews({ headline: `${w.countries[leader].name} becomes the leading partner of ${REGION_DEFS[r].name}`, icon: "diplomacy", iso3: leader, place: REGION_DEFS[r].name, weight: 7 });
      ctx.globe.push({ kind: "influence", from: leader, to: r as RegionId });
    }
  }

  for (const s of SEATS) {
    const c = w.countries[s];
    const o = SEATS.filter((x) => x !== s);
    const avgRel = o.reduce((t, x) => t + w.pairs[x][s].relations, 0) / o.length;
    const treaties = w.treaties.filter((t) => t.a === s || t.b === s).length;
    const led = REGIONS.filter((r) => w.regions[r].leader === s).length;
    const target = c.influenceBase + 0.3 * (avgRel + 100) / 2 + 3 * treaties + 10 * ctx.s[s].aidGivenPct + REGION.influencePerTurn * 2 * led;
    const before = c.influence;
    c.influence = clamp(before + (target - before) * 0.3);
    ctx.causes.add(s, "influence", c.influence - before, "diplomacy.influence", { actor: s });
    const m0 = c.military;
    c.military = clamp(c.military + 0.06 * (c.index.defence - 50));
    if (Math.abs(c.military - m0) > 0.05) ctx.causes.add(s, "military", c.military - m0, "budget.defence", { actor: s });
  }

  const defenceUp = SEATS.reduce((t, s) => t + Math.max(0, w.countries[s].budget.defence / w.countries[s].baseline.defence - 1) * 10, 0);
  w.tension = clamp(start.tension - TENSION.decay + ctx.world.tensionAdd + defenceUp + TENSION.treaty * ctx.world.newTreaties, 10, 100);
  w.globalGrowth = -0.015 * (w.price.energy - 100 + 0.5 * (w.price.food - 100)) - (w.tension >= TENSION.panicAt ? 0.5 : 0);
}

