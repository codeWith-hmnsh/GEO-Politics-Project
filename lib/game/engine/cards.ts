// Card library v1, 33 cards (docs4.0/ACTIONS.md §3) and the 5–7 card suggestion (§4).
import type { Ctx } from "./ctx";
import { REGION_DEFS } from "./regions";
import { stream } from "./rng";
import { RELATIONS, TENSION } from "./rules";
import { breakTreaty, rel, relBoth, trust } from "./treaties";
import type { CardParams, CountryState, Good, Iso3, RegionId, WorldState } from "./types";
import { GOODS, RATINGS, REGIONS, SEATS } from "./types";
import { clamp, isExporter, others, surplus } from "./util";

export type CardGroup = "economy" | "trade" | "energy" | "food" | "people" | "diplomacy";
export type ParamKind = "target" | "region" | "targetOrRegion" | "good" | "units" | "rate" | "amount" | "treaty";

export interface CardDef {
  id: string;
  group: CardGroup;
  name: string;
  pc: 0 | 1 | 2;
  costPct?: number; // % of GDP paid now
  params: ParamKind[];
  summary: string;
  learn?: string; // glossary term
  legal: (w: WorldState, me: Iso3, p: CardParams) => true | string;
  relevance: (w: WorldState, me: Iso3) => number;
  apply: (ctx: Ctx, me: Iso3, p: CardParams, cause: string) => void;
  /** Default parameters a bot or the UI pre-fills. */
  defaults?: (w: WorldState, me: Iso3) => CardParams | null;
}

const yes = () => true as const;
const short = (c: CountryState, g: Good) => Math.max(0, 1 - c.goods[g].supplyRatio);
const gdpShare = (w: WorldState, s: Iso3) => w.countries[s].gdp / SEATS.reduce((t, x) => t + w.countries[x].gdp, 0);

/** Combined GDP share of seats sanctioning `target`, plus active global sanctions (SYSTEMS §5.4). */
export function sanctionStrength(w: WorldState, target: Iso3, exclude?: Iso3): number {
  let s = 0;
  for (const x of SEATS) if (x !== target && x !== exclude && w.pairs[x][target].sanction) s += gdpShare(w, x);
  if (w.resolutions.some((r) => r.resolutionId === "globalSanctions" && r.target === target)) s += 0.5;
  return Math.min(1, s);
}

const needTarget = (p: CardParams) => (p.target ? true : "Choose a country");
const bestSupplier = (w: WorldState, me: Iso3, g: Good): Iso3 | undefined =>
  others(me)
    .filter((s) => surplus(w.countries[s], g) > 1 && !w.pairs[s][me].embargo.includes(g) && !w.pairs[me][s].sanction && !w.pairs[s][me].sanction)
    .sort((a, b) => surplus(w.countries[b], g) - surplus(w.countries[a], g))[0];
const worstRelation = (w: WorldState, me: Iso3) => others(me).sort((a, b) => w.pairs[me][a].relations - w.pairs[me][b].relations)[0];
const bestFriend = (w: WorldState, me: Iso3) => others(me).sort((a, b) => w.pairs[me][b].relations - w.pairs[me][a].relations)[0];
const weakestRegion = (w: WorldState, me: Iso3): RegionId =>
  [...REGIONS].sort((a, b) => {
    const gap = (r: RegionId) => {
      const sw = w.regions[r].sway;
      const top = Math.max(...SEATS.map((s) => sw[s]));
      return top - sw[me];
    };
    return gap(a) - gap(b);
  })[0];

export const CARDS: CardDef[] = [
  // ───────── Economy (6) ─────────
  {
    id: "economy.stimulus",
    group: "economy",
    name: "Stimulus Package",
    pc: 1,
    costPct: 1.0,
    params: [],
    summary: "Growth +0.8 this year; inflation +0.6; deficit up",
    learn: "fiscal-stimulus",
    legal: yes,
    relevance: (w, me) => Math.max(0, 25 - w.countries[me].growth * 4) + Math.max(0, w.countries[me].unemployment - w.countries[me].unemployment0) * 8,
    apply: (ctx, me, _p, cause) => {
      ctx.mod(me, "growth", 0.8, "card.stimulus", { actor: me, parent: cause });
      ctx.mod(me, "inflation", 0.6, "card.stimulus", { actor: me, parent: cause });
    },
  },
  {
    id: "economy.austerity",
    group: "economy",
    name: "Austerity Drive",
    pc: 1,
    params: [],
    summary: "Deficit −1% of GDP; growth −0.5; stability −4",
    legal: yes,
    relevance: (w, me) => {
      const c = w.countries[me];
      return Math.max(0, -c.balancePct - 3) * 6 + Math.max(0, c.inflation - 6) * 4 + (RATINGS.indexOf(c.rating) >= 4 ? 15 : 0);
    },
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      const saved = c.gdp * 0.01;
      c.treasury += saved;
      ctx.causes.add(me, "treasury", saved, "card.austerity", { actor: me, parent: cause });
      ctx.mod(me, "growth", -0.5, "card.austerity", { actor: me, parent: cause });
      ctx.mod(me, "stability", -4, "card.austerity", { actor: me, parent: cause });
      ctx.mod(me, "inflation", -0.4, "card.austerity", { actor: me, parent: cause });
    },
  },
  {
    id: "economy.openInvestment",
    group: "economy",
    name: "Open to Foreign Investment",
    pc: 1,
    params: [],
    summary: "Investment +0.5% of GDP; industry +2",
    legal: (w, me) => (w.countries[me].stability >= 45 ? true : "Needs stability 45+"),
    relevance: (w, me) => 12 + Math.max(0, 60 - w.countries[me].industry) * 0.5,
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      c.industry = clamp(c.industry + 2);
      ctx.causes.add(me, "industry", 2, "card.openInvestment", { actor: me, parent: cause });
      ctx.s[me].investmentReceivedPct += 0.5;
    },
  },
  {
    id: "economy.sez",
    group: "economy",
    name: "Special Economic Zone",
    pc: 1,
    costPct: 0.3,
    params: [],
    summary: "Industry +4, tech production +3%, jobs",
    legal: (w, me) => (w.countries[me].infrastructure >= 40 ? true : "Needs infrastructure 40+"),
    relevance: (w, me) => Math.max(0, w.countries[me].unemployment - 4) * 5 + short(w.countries[me], "tech") * 30,
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      c.industry = clamp(c.industry + 4);
      ctx.causes.add(me, "industry", 4, "card.sez", { actor: me, parent: cause });
      const add = c.goods.tech.prod * 0.03;
      c.goods.tech.prod += add;
      ctx.causes.add(me, "tech.prod", add, "card.sez", { actor: me, parent: cause });
      ctx.mod(me, "unemployment", -0.2, "card.sez", { actor: me, parent: cause });
    },
  },
  {
    id: "economy.printMoney",
    group: "economy",
    name: "Print Money",
    pc: 1,
    params: [],
    summary: "Treasury +2% of GDP; inflation +4; rating −1 step",
    learn: "inflation",
    legal: (w, me) => (w.countries[me].lastCards.includes("economy.printMoney") ? "Not two years in a row" : true),
    relevance: (w, me) => (w.countries[me].treasury < w.countries[me].gdp * 0.01 ? 25 : 0),
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      const add = c.gdp * 0.02;
      c.treasury += add;
      c.flags.push("ratingPenalty");
      ctx.causes.add(me, "treasury", add, "card.printMoney", { actor: me, parent: cause });
      ctx.mod(me, "inflation", 4, "card.printMoney", { actor: me, parent: cause });
    },
  },
  {
    id: "economy.imf",
    group: "economy",
    name: "IMF Programme",
    pc: 2,
    params: [],
    summary: "Treasury +3% of GDP; welfare and defence capped 3 years; stability −6",
    learn: "imf",
    legal: (w, me) => {
      const c = w.countries[me];
      return RATINGS.indexOf(c.rating) >= 4 || c.treasury < c.gdp * 0.01 ? true : "Only when rating is BB or lower, or the treasury is nearly empty";
    },
    relevance: (w, me) => (RATINGS.indexOf(w.countries[me].rating) >= 5 ? 40 : 10),
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      const add = c.gdp * 0.03;
      c.treasury += add;
      c.imfTurnsLeft = 3;
      ctx.causes.add(me, "treasury", add, "card.imf", { actor: me, parent: cause });
      ctx.mod(me, "stability", -6, "card.imf", { actor: me, parent: cause });
      ctx.addNews({ headline: `${c.name} agrees an IMF programme`, icon: "economy", iso3: me, weight: 6 });
    },
  },

  // ───────── Trade (6) ─────────
  {
    id: "trade.tariff",
    group: "trade",
    name: "Impose Tariff",
    pc: 1,
    params: ["target", "rate"],
    summary: "Tariff 10% or 25% on a country: protects industry, raises prices",
    learn: "tariff",
    legal: (w, me, p) => {
      const t = needTarget(p);
      if (t !== true) return t;
      const rate = p.rate === 25 ? 25 : 10;
      return w.pairs[me][p.target!].tariff >= rate ? "Tariff already at that rate" : true;
    },
    relevance: (w, me) => {
      const worst = worstRelation(w, me);
      return Math.max(0, -w.pairs[me][worst].relations - 10) * 0.6 + (w.pairs[worst][me].tariff > 0 ? 25 : 0);
    },
    defaults: (w, me) => {
      const t = others(me).find((s) => w.pairs[s][me].tariff > w.pairs[me][s].tariff) ?? worstRelation(w, me);
      return { target: t, rate: 10 };
    },
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const t = p.target!;
      const rate = p.rate === 25 ? 25 : 10;
      w.pairs[me][t].tariff = rate;
      rel(w, t, me, RELATIONS.tariff);
      rel(w, me, t, RELATIONS.tariff / 2);
      ctx.world.tensionAdd += TENSION.tariff;
      const c = w.countries[me];
      c.industry = clamp(c.industry + rate * 0.05);
      ctx.causes.add(me, "industry", rate * 0.05, "card.tariff.protect", { actor: me, parent: cause });
      ctx.mod(me, "inflation", rate * 0.012, "card.tariff.prices", { actor: me, parent: cause });
      ctx.mod(me, "growth", -rate * 0.01 * gdpShare(w, t) * 2, "card.tariff.costs", { actor: me, parent: cause });
      ctx.mod(t, "growth", -rate * 0.04 * gdpShare(w, me), "card.tariff.exportsHit", { actor: me, parent: cause });
      ctx.globe.push({ kind: "tariff", from: me, to: t, label: `${rate}%` });
      ctx.setMove(me, `${rate}% tariff on ${w.countries[t].name}`);
      ctx.addNews({ headline: `${c.name} slaps ${rate}% tariffs on ${w.countries[t].name}`, icon: "trade", iso3: me, weight: 5 });
    },
  },
  {
    id: "trade.cutTariffs",
    group: "trade",
    name: "Cut Tariffs",
    pc: 1,
    params: ["target"],
    summary: "Remove your tariff on a country; relations +6; prices down",
    legal: (w, me, p) => (p.target && w.pairs[me][p.target].tariff > 0 ? true : "No tariff to cut"),
    relevance: (w, me) => (others(me).some((s) => w.pairs[me][s].tariff > 0) ? 18 + Math.max(0, w.countries[me].inflation - 5) * 4 : 0),
    defaults: (w, me) => {
      const t = others(me).find((s) => w.pairs[me][s].tariff > 0);
      return t ? { target: t } : null;
    },
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const t = p.target!;
      const old = w.pairs[me][t].tariff;
      w.pairs[me][t].tariff = 0;
      relBoth(w, me, t, 6);
      ctx.mod(me, "inflation", -old * 0.01, "card.cutTariffs", { actor: me, parent: cause });
      ctx.setMove(me, `Cut tariffs on ${w.countries[t].name}`);
    },
  },
  {
    id: "trade.sanction",
    group: "trade",
    name: "Sanction",
    pc: 2,
    params: ["target"],
    summary: "Block trade with a country and add friction to its trade with others",
    learn: "sanctions",
    legal: (w, me, p) => (!p.target ? "Choose a country" : w.pairs[me][p.target].sanction ? "Already sanctioning" : true),
    relevance: (w, me) => {
      const worst = worstRelation(w, me);
      return Math.max(0, -w.pairs[me][worst].relations - 30) * 0.8 + (others(me).some((s) => s !== worst && w.pairs[s][worst].sanction) ? 10 : 0);
    },
    defaults: (w, me) => ({ target: worstRelation(w, me) }),
    apply: (ctx, me, p, cause) => applySanction(ctx, me, p.target!, cause, "Sanction"),
  },
  {
    id: "trade.liftSanction",
    group: "trade",
    name: "Lift Sanction",
    pc: 1,
    params: ["target"],
    summary: "End your sanction; relations +10",
    legal: (w, me, p) => (p.target && w.pairs[me][p.target].sanction ? true : "No sanction to lift"),
    relevance: (w, me) => (others(me).some((s) => w.pairs[me][s].sanction) ? 15 + Math.max(0, w.countries[me].goods.energy.supplyRatio < 0.95 ? 15 : 0) : 0),
    defaults: (w, me) => {
      const t = others(me).find((s) => w.pairs[me][s].sanction);
      return t ? { target: t } : null;
    },
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const t = p.target!;
      w.pairs[me][t].sanction = false;
      relBoth(w, me, t, 10);
      ctx.causes.add(t, "relations", 10, "card.liftSanction", { actor: me, parent: cause });
      ctx.setMove(me, `Lifts sanctions on ${w.countries[t].name}`);
      ctx.addNews({ headline: `${w.countries[me].name} lifts sanctions on ${w.countries[t].name}`, icon: "trade", iso3: me, weight: 5 });
    },
  },
  {
    id: "trade.embargo",
    group: "trade",
    name: "Embargo",
    pc: 1,
    params: ["target", "good"],
    summary: "Stop selling one good to a country",
    legal: (w, me, p) => {
      if (!p.target || !p.good) return "Choose a country and a good";
      if (!isExporter(w.countries[me], p.good)) return `Needs: ${p.good} exporter`;
      return w.pairs[me][p.target].embargo.includes(p.good) ? "Already embargoed" : true;
    },
    relevance: (w, me) => {
      const worst = worstRelation(w, me);
      return GOODS.some((g) => isExporter(w.countries[me], g)) ? Math.max(0, -w.pairs[me][worst].relations - 35) * 0.6 : 0;
    },
    defaults: (w, me) => {
      const g = GOODS.find((x) => isExporter(w.countries[me], x));
      return g ? { target: worstRelation(w, me), good: g } : null;
    },
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const t = p.target!;
      w.pairs[me][t].embargo.push(p.good!);
      rel(w, t, me, -8);
      ctx.world.tensionAdd += TENSION.embargo;
      ctx.causes.add(t, `${p.good}.premium`, 10, "card.embargo", { actor: me, parent: cause });
      for (const tr of [...w.treaties]) {
        const sells = (tr.a === me && tr.b === t ? tr.aGives : tr.b === me && tr.a === t ? tr.bGives : []).some((x) => x.kind === "goods" && x.good === p.good);
        if (sells) breakTreaty(ctx, tr, me, "embargo");
      }
      ctx.setMove(me, `${p.good} embargo on ${w.countries[t].name}`);
      ctx.addNews({ headline: `${w.countries[me].name} halts ${p.good} sales to ${w.countries[t].name}`, icon: p.good!, iso3: me, weight: 6 });
    },
  },
  {
    id: "trade.exportPush",
    group: "trade",
    name: "Export Push",
    pc: 1,
    costPct: 0.1,
    params: ["good"],
    summary: "Sell 5% more of a good this year",
    legal: (w, me, p) => (p.good && surplus(w.countries[me], p.good) > 0.5 ? true : "Needs a surplus in that good"),
    relevance: (w, me) => (GOODS.some((g) => surplus(w.countries[me], g) > 2 && w.price[g] >= 105) ? 22 : GOODS.some((g) => surplus(w.countries[me], g) > 2) ? 8 : 0),
    defaults: (w, me) => {
      const g = [...GOODS].sort((a, b) => surplus(w.countries[me], b) * w.price[b] - surplus(w.countries[me], a) * w.price[a])[0];
      return surplus(w.countries[me], g) > 0.5 ? { good: g } : null;
    },
    apply: (ctx, me, p, cause) => {
      ctx.s[me].prodShock[p.good!] *= 1.05;
      ctx.mod(me, "growth", 0.15, "card.exportPush", { actor: me, parent: cause });
    },
  },

  // ───────── Energy (5) ─────────
  {
    id: "energy.secureImports",
    group: "energy",
    name: "Secure Oil Imports",
    pc: 1,
    params: ["target", "units"],
    summary: "Priority purchase of energy from one supplier this year at +5%",
    learn: "energy-security",
    legal: (w, me, p) => {
      if (!p.target) return "Choose a supplier";
      const s = w.countries[p.target];
      if (surplus(s, "energy") <= 1) return "Supplier has no spare energy";
      if (w.pairs[p.target][me].embargo.includes("energy")) return "Supplier embargoes you";
      if (w.pairs[me][p.target].sanction || w.pairs[p.target][me].sanction) return "Sanctions block this";
      return true;
    },
    relevance: (w, me) => short(w.countries[me], "energy") * 300 + (w.price.energy >= 115 ? 20 : 0) + (w.countries[me].goods.energy.demand > w.countries[me].goods.energy.prod ? 8 : 0),
    defaults: (w, me) => {
      const s = bestSupplier(w, me, "energy");
      if (!s) return null;
      const need = Math.max(1, w.countries[me].goods.energy.demand - w.countries[me].goods.energy.prod);
      return { target: s, units: Math.round(Math.min(need * 0.5, surplus(w.countries[s], "energy") * 0.5)) || 1 };
    },
    apply: (ctx, me, p, cause) => {
      const s = ctx.start.countries[p.target!];
      const units = Math.max(1, Math.min(p.units ?? 4, surplus(s, "energy") * 0.6));
      ctx.s[me].priority.push({ buyer: me, seller: p.target!, good: "energy", units, premium: 1.05, causeId: cause });
      ctx.setMove(me, `Secures oil from ${s.name}`);
    },
  },
  {
    id: "energy.fuelSubsidy",
    group: "energy",
    name: "Fuel Subsidy",
    pc: 0,
    costPct: 0.3,
    params: [],
    summary: "Halve the effect of energy prices on inflation this year; stability +3",
    legal: (w) => (w.price.energy >= 110 ? true : "Only when the energy price is 110+"),
    relevance: (w) => Math.max(0, w.price.energy - 105) * 1.5,
    apply: (ctx, me, _p, cause) => {
      ctx.s[me].fuelSubsidy = true;
      ctx.mod(me, "stability", 3, "card.fuelSubsidy", { actor: me, parent: cause });
    },
  },
  {
    id: "energy.efficiency",
    group: "energy",
    name: "Efficiency Drive",
    pc: 1,
    costPct: 0.2,
    params: [],
    summary: "Energy demand −3%, permanent",
    legal: (w, me) => (w.countries[me].flags.some((f) => f.startsWith("efficiency:") && w.turn - Number(f.split(":")[1]) < 3) ? "Used in the last 2 years" : true),
    relevance: (w, me) => (w.countries[me].goods.energy.demand > w.countries[me].goods.energy.prod ? 14 + short(w.countries[me], "energy") * 60 : 2),
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      const cut = c.goods.energy.demand * 0.03;
      c.goods.energy.demand -= cut;
      c.flags.push(`efficiency:${ctx.w.turn}`);
      ctx.causes.add(me, "energy.demand", -cut, "card.efficiency", { actor: me, parent: cause });
    },
  },
  {
    id: "energy.raiseOutput",
    group: "energy",
    name: "Raise Output",
    pc: 1,
    params: [],
    summary: "Energy production +5% this year; world price falls",
    legal: (w, me) => (isExporter(w.countries[me], "energy") ? true : "Needs: energy exporter"),
    relevance: (w, me) => (isExporter(w.countries[me], "energy") ? Math.max(0, w.price.energy - 100) * 1.2 + 5 : 0),
    apply: (ctx, me, _p, cause) => {
      ctx.s[me].prodShock.energy *= 1.05;
      ctx.causes.add(me, "energy.prod", ctx.w.countries[me].goods.energy.prod * 0.05, "card.raiseOutput", { actor: me, parent: cause });
      ctx.setMove(me, "Raises oil output");
    },
  },
  {
    id: "energy.cutOutput",
    group: "energy",
    name: "Cut Output",
    pc: 1,
    params: [],
    summary: "Energy production −8% this year; world price rises",
    legal: (w, me) => (isExporter(w.countries[me], "energy") ? true : "Needs: energy exporter"),
    relevance: (w, me) => (isExporter(w.countries[me], "energy") ? Math.max(0, 100 - w.price.energy) * 1.5 + 3 : 0),
    apply: (ctx, me, _p, cause) => {
      ctx.s[me].prodShock.energy *= 0.92;
      ctx.causes.add(me, "energy.prod", -ctx.w.countries[me].goods.energy.prod * 0.08, "card.cutOutput", { actor: me, parent: cause });
      ctx.setMove(me, "Cuts oil output");
      ctx.addNews({ headline: `${ctx.w.countries[me].name} cuts oil output`, icon: "energy", iso3: me, weight: 5 });
    },
  },

  // ───────── Food (4) ─────────
  {
    id: "food.releaseReserves",
    group: "food",
    name: "Release Grain Reserves",
    pc: 0,
    params: [],
    summary: "Use the whole food reserve this year if needed",
    legal: (w, me) => (w.countries[me].goods.food.reserve > 0 ? true : "No food reserve"),
    relevance: (w, me) => short(w.countries[me], "food") * 300 + (w.price.food >= 112 ? 15 : 0),
    apply: (ctx, me, _p, cause) => {
      ctx.s[me].releaseReserve.food = true;
      ctx.mod(me, "stability", 1, "card.releaseReserves", { actor: me, parent: cause });
    },
  },
  {
    id: "food.exportBan",
    group: "food",
    name: "Ban Food Exports",
    pc: 1,
    params: [],
    summary: "Keep food at home; world food price up; importers angry",
    learn: "export-ban",
    legal: (w, me) => {
      if (!isExporter(w.countries[me], "food")) return "Needs: food exporter";
      return w.resolutions.some((r) => r.resolutionId === "foodBanBan") ? "Banned by a World Vote" : true;
    },
    relevance: (w, me) => (isExporter(w.countries[me], "food") ? Math.max(0, w.price.food - 105) * 1.2 + Math.max(0, w.countries[me].inflation - 5) * 3 : 0),
    apply: (ctx, me, _p, cause) => {
      const { w } = ctx;
      ctx.s[me].prodShock.food *= 0.92; // keeps 8% off the market
      w.countries[me].flags.push(`foodBan:${w.turn}`);
      ctx.mod(me, "inflation", -0.5, "card.exportBan", { actor: me, parent: cause });
      for (const s of others(me)) if (w.countries[s].goods.food.demand > w.countries[s].goods.food.prod) rel(w, s, me, -8);
      ctx.setMove(me, "Bans food exports");
      ctx.addNews({ headline: `${w.countries[me].name} bans food exports`, icon: "food", iso3: me, weight: 6 });
    },
  },
  {
    id: "food.emergencyImports",
    group: "food",
    name: "Emergency Food Imports",
    pc: 1,
    params: [],
    summary: "Buy food first from the world market this year (+8%)",
    legal: (w, me) => (w.countries[me].goods.food.supplyRatio < 1 || w.countries[me].goods.food.prod < w.countries[me].goods.food.demand ? true : "Food supply is full"),
    relevance: (w, me) => short(w.countries[me], "food") * 280 + (w.price.food > 110 ? 10 : 0),
    apply: (ctx, me, _p, cause) => {
      const g = ctx.start.countries[me].goods.food;
      ctx.s[me].priority.push({ buyer: me, seller: "market", good: "food", units: Math.max(1, g.demand - g.prod), premium: 1.08, causeId: cause });
    },
  },
  {
    id: "food.farmSupport",
    group: "food",
    name: "Farm Support Programme",
    pc: 1,
    costPct: 0.2,
    params: [],
    summary: "Food production +3%; stability +2",
    legal: yes,
    relevance: (w, me) => 6 + short(w.countries[me], "food") * 100 + (w.countries[me].goods.food.demand > w.countries[me].goods.food.prod ? 10 : 0),
    apply: (ctx, me, _p, cause) => {
      const g = ctx.w.countries[me].goods.food;
      const add = g.prod * 0.03;
      g.prod += add;
      ctx.causes.add(me, "food.prod", add, "card.farmSupport", { actor: me, parent: cause });
      ctx.mod(me, "stability", 2, "card.farmSupport", { actor: me, parent: cause });
    },
  },

  // ───────── People (5) ─────────
  {
    id: "people.jobsGuarantee",
    group: "people",
    name: "Jobs Guarantee Scheme",
    pc: 1,
    costPct: 0.4,
    params: [],
    summary: "Unemployment −0.5; stability +3; inflation +0.2",
    learn: "unemployment",
    legal: (w, me) => (w.countries[me].unemployment >= 4 ? true : "Unemployment is below 4%"),
    relevance: (w, me) => Math.max(0, w.countries[me].unemployment - 4) * 6 + Math.max(0, w.countries[me].unemployment - w.countries[me].unemployment0) * 10,
    apply: (ctx, me, _p, cause) => {
      ctx.mod(me, "unemployment", -0.5, "card.jobsGuarantee", { actor: me, parent: cause });
      ctx.mod(me, "stability", 3, "card.jobsGuarantee", { actor: me, parent: cause });
      ctx.mod(me, "inflation", 0.2, "card.jobsGuarantee", { actor: me, parent: cause });
    },
  },
  {
    id: "people.skillsDrive",
    group: "people",
    name: "Skills Drive",
    pc: 1,
    costPct: 0.15,
    params: [],
    summary: "Skills +2 now",
    legal: yes,
    relevance: (w, me) => 8 + Math.max(0, 60 - w.countries[me].skills) * 0.4,
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      c.skills = clamp(c.skills + 2);
      ctx.causes.add(me, "skills", 2, "card.skillsDrive", { actor: me, parent: cause });
    },
  },
  {
    id: "people.healthCampaign",
    group: "people",
    name: "Health Campaign",
    pc: 1,
    costPct: 0.2,
    params: [],
    summary: "Health +4",
    legal: yes,
    relevance: (w, me) => 6 + Math.max(0, 60 - w.countries[me].health) * 0.5,
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      c.health = clamp(c.health + 4);
      ctx.causes.add(me, "health", 4, "card.healthCampaign", { actor: me, parent: cause });
    },
  },
  {
    id: "people.cashTransfers",
    group: "people",
    name: "Cash Transfers",
    pc: 0,
    costPct: 0.5,
    params: [],
    summary: "Stability +5 this year; inflation +0.4",
    legal: (w, me) => (w.countries[me].stability < 60 ? true : "Only when stability is below 60"),
    relevance: (w, me) => Math.max(0, 55 - w.countries[me].stability) * 2,
    apply: (ctx, me, _p, cause) => {
      ctx.mod(me, "stability", 5, "card.cashTransfers", { actor: me, parent: cause });
      ctx.mod(me, "inflation", 0.4, "card.cashTransfers", { actor: me, parent: cause });
    },
  },
  {
    id: "people.labourReform",
    group: "people",
    name: "Labour Reform",
    pc: 2,
    params: [],
    summary: "Growth +0.3 a year, permanent; stability −5 now",
    legal: (w, me) => (w.countries[me].flags.includes("labourReform") ? "Already done" : w.countries[me].stability >= 40 ? true : "Needs stability 40+"),
    relevance: (w, me) => (w.countries[me].stability >= 55 ? 12 : 0),
    apply: (ctx, me, _p, cause) => {
      const c = ctx.w.countries[me];
      c.growthBase += 0.3;
      c.flags.push("labourReform");
      ctx.causes.add(me, "growthBase", 0.3, "card.labourReform", { actor: me, parent: cause });
      ctx.mod(me, "stability", -5, "card.labourReform", { actor: me, parent: cause });
    },
  },

  // ───────── Diplomacy (7) ─────────
  {
    id: "diplomacy.proposeDeal",
    group: "diplomacy",
    name: "Propose Deal",
    pc: 1,
    params: [],
    summary: "Open the proposal composer: gives / wants / duration",
    legal: yes,
    relevance: () => 0, // pinned, never ranked
    apply: () => {},
  },
  {
    id: "diplomacy.foreignAid",
    group: "diplomacy",
    name: "Foreign Aid",
    pc: 1,
    params: ["targetOrRegion", "amount"],
    summary: "Relations +10 with a country, or sway in a partner region",
    legal: (w, me, p) => {
      if (!p.target && !p.region) return "Choose a country or a region";
      const amount = p.amount ?? w.countries[me].gdp * 0.001;
      return amount > 0 && amount <= w.countries[me].treasury ? true : "Not enough money";
    },
    relevance: (w, me) => 8 + (w.countries[me].treasury > w.countries[me].gdp * 0.03 ? 8 : 0),
    defaults: (w, me) => ({ region: weakestRegion(w, me), amount: Math.round(w.countries[me].gdp * 0.001) }),
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const c = w.countries[me];
      const amount = p.amount ?? c.gdp * 0.001;
      c.treasury -= amount;
      const pct = (amount / c.gdp) * 100;
      ctx.s[me].aidGivenPct += pct;
      ctx.causes.add(me, "treasury", -amount, "card.foreignAid", { actor: me, parent: cause });
      if (p.target) {
        w.countries[p.target].treasury += amount;
        rel(w, p.target, me, RELATIONS.aid);
        trust(w, p.target, me, 3);
        ctx.setMove(me, `Aid to ${w.countries[p.target].name}`);
      } else if (p.region) {
        ctx.s[me].aidToRegion[p.region] = (ctx.s[me].aidToRegion[p.region] ?? 0) + pct;
        ctx.setMove(me, `Aid to ${REGION_DEFS[p.region].name}`);
        ctx.globe.push({ kind: "influence", from: me, to: p.region });
      }
    },
  },
  {
    id: "diplomacy.regionalInvestment",
    group: "diplomacy",
    name: "Regional Investment",
    pc: 1,
    costPct: 0.3,
    params: ["region"],
    summary: "Sway +8 in one partner region",
    learn: "sphere-of-influence",
    legal: (_w, _me, p) => (p.region ? true : "Choose a region"),
    relevance: (w, me) => {
      const r = weakestRegion(w, me);
      const sw = w.regions[r].sway;
      const gap = Math.max(...SEATS.map((s) => sw[s])) - sw[me];
      return 10 + Math.max(0, 15 - gap);
    },
    defaults: (w, me) => ({ region: weakestRegion(w, me) }),
    apply: (ctx, me, p, cause) => {
      const r = p.region!;
      ctx.s[me].swayAdd[r] = (ctx.s[me].swayAdd[r] ?? 0) + 8;
      ctx.mod(me, "growth", 0.05, "card.regionalInvestment", { actor: me, parent: cause });
      ctx.causes.add(me, `sway.${r}`, 8, "card.regionalInvestment", { actor: me, parent: cause });
      ctx.setMove(me, `Invests in ${REGION_DEFS[r].name}`);
      ctx.globe.push({ kind: "influence", from: me, to: r });
    },
  },
  {
    id: "diplomacy.summit",
    group: "diplomacy",
    name: "Summit Diplomacy",
    pc: 1,
    params: ["target"],
    summary: "Relations +6, trust +4 with one country; tension −2",
    legal: (w, me, p) => (!p.target ? "Choose a country" : w.pairs[me][p.target].relations > -50 ? true : "Relations too low"),
    relevance: (w) => 6 + Math.max(0, w.tension - 40) * 0.4,
    defaults: (w, me) => ({ target: others(me).filter((s) => w.pairs[me][s].relations > -50).sort((a, b) => w.pairs[me][a].trust - w.pairs[me][b].trust)[0] ?? bestFriend(w, me) }),
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      relBoth(w, me, p.target!, 6);
      trust(w, me, p.target!, 4);
      trust(w, p.target!, me, 4);
      ctx.world.tensionAdd -= 2;
      ctx.causes.add(me, "relations", 6, "card.summit", { actor: me, parent: cause });
      ctx.setMove(me, `Summit with ${w.countries[p.target!].name}`);
      ctx.addNews({ headline: `${w.countries[me].name} and ${w.countries[p.target!].name} hold a summit`, icon: "diplomacy", iso3: me, weight: 3 });
    },
  },
  {
    id: "diplomacy.pressure",
    group: "diplomacy",
    name: "Pressure",
    pc: 1,
    params: ["target"],
    summary: "Make a weaker country drop its tariff or sanction on you; tension +5",
    legal: (w, me, p) => {
      if (!p.target) return "Choose a country";
      const t = p.target;
      if (!(w.pairs[t][me].tariff > 0 || w.pairs[t][me].sanction)) return "They have no tariff or sanction on you";
      const allies = w.treaties.filter((x) => x.a === me || x.b === me).length * 3;
      return w.countries[me].military + allies > w.countries[t].military * 1.2 ? true : "Your military is not strong enough";
    },
    relevance: (w, me) => (others(me).some((s) => (w.pairs[s][me].tariff > 0 || w.pairs[s][me].sanction) && w.countries[me].military > w.countries[s].military * 1.2) ? 18 : 0),
    defaults: (w, me) => {
      const t = others(me).find((s) => w.pairs[s][me].tariff > 0 || w.pairs[s][me].sanction);
      return t ? { target: t } : null;
    },
    apply: (ctx, me, p, cause) => {
      const { w } = ctx;
      const t = p.target!;
      w.pairs[t][me].tariff = 0;
      w.pairs[t][me].sanction = false;
      rel(w, t, me, RELATIONS.pressure);
      ctx.world.tensionAdd += TENSION.pressure;
      ctx.causes.add(t, "relations", RELATIONS.pressure, "card.pressure", { actor: me, parent: cause });
      ctx.setMove(me, `Pressures ${w.countries[t].name}`);
      ctx.addNews({ headline: `Under pressure from ${w.countries[me].name}, ${w.countries[t].name} backs down`, icon: "diplomacy", iso3: me, weight: 6 });
    },
  },
  {
    id: "diplomacy.joinSanction",
    group: "diplomacy",
    name: "Join Sanction",
    pc: 1,
    params: ["target"],
    summary: "Join an existing sanction on a country",
    legal: (w, me, p) => {
      if (!p.target) return "Choose a country";
      if (w.pairs[me][p.target].sanction) return "Already sanctioning";
      return others(me).some((s) => s !== p.target && w.pairs[s][p.target!].sanction) ? true : "Nobody sanctions them yet";
    },
    relevance: (w, me) => {
      const t = others(me).find((x) => !w.pairs[me][x].sanction && others(x).some((s) => s !== me && w.pairs[s][x].sanction));
      return t ? Math.max(0, 10 - w.pairs[me][t].relations) * 0.6 : 0;
    },
    defaults: (w, me) => {
      const t = others(me).find((x) => !w.pairs[me][x].sanction && others(x).some((s) => s !== me && w.pairs[s][x].sanction));
      return t ? { target: t } : null;
    },
    apply: (ctx, me, p, cause) => applySanction(ctx, me, p.target!, cause, "Joins sanction on"),
  },
  {
    id: "diplomacy.cancelTreaty",
    group: "diplomacy",
    name: "Cancel Treaty",
    pc: 0,
    params: ["treaty"],
    summary: "End a treaty early; broken-promise penalties",
    legal: (w, me, p) => (w.treaties.some((t) => t.id === p.treatyId && (t.a === me || t.b === me)) ? true : "Choose one of your treaties"),
    relevance: () => 0,
    apply: (ctx, me, p) => {
      const t = ctx.w.treaties.find((x) => x.id === p.treatyId);
      if (t) breakTreaty(ctx, t, me, "cancelled");
    },
  },
];

function applySanction(ctx: Ctx, me: Iso3, t: Iso3, cause: string, verb: string) {
  const { w } = ctx;
  w.pairs[me][t].sanction = true;
  relBoth(w, me, t, RELATIONS.sanction);
  ctx.world.tensionAdd += TENSION.sanction;
  for (const tr of [...w.treaties]) if ((tr.a === me && tr.b === t) || (tr.a === t && tr.b === me)) breakTreaty(ctx, tr, me, "sanctions");
  for (const r of REGIONS) if (REGION_DEFS[r].dependsOn.includes(t)) ctx.s[me].regionPenalty[r] = (ctx.s[me].regionPenalty[r] ?? 0) + 6;
  ctx.causes.add(t, "sanctions", 1, "card.sanction", { actor: me, parent: cause });
  ctx.globe.push({ kind: "sanction", from: me, to: t });
  ctx.setMove(me, `${verb} ${w.countries[t].name}`);
  ctx.addNews({ headline: `${w.countries[me].name} sanctions ${w.countries[t].name}`, icon: "trade", iso3: me, weight: 7 });
}

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function cardCost(w: WorldState, me: Iso3, card: CardDef, p: CardParams): number {
  if (card.id === "diplomacy.foreignAid") return p.amount ?? w.countries[me].gdp * 0.001;
  return card.costPct ? (w.countries[me].gdp * card.costPct) / 100 : 0;
}

export function cardLegal(w: WorldState, me: Iso3, cardId: string, p: CardParams = {}): true | string {
  const card = CARD_BY_ID.get(cardId);
  if (!card) return "Unknown card";
  if (p.target && (p.target === me || !SEATS.includes(p.target))) return "Invalid target";
  if (p.region && !REGIONS.includes(p.region)) return "Invalid region";
  if (w.countries[me].pc < card.pc) return `Not enough PC (needs ${card.pc})`;
  const cost = cardCost(w, me, card, p);
  if (cost > 0 && w.countries[me].treasury < cost) return "Not enough money";
  return card.legal(w, me, p);
}

const GROUP_BY_SCENARIO: Record<WorldState["scenario"], CardGroup | null> = {
  energyShock: "energy",
  foodCrisis: "food",
  tradeWar: "trade",
  calmStart: null,
};

/** The 5–7 cards for a turn (ACTIONS §4). Always ends with Propose Deal. */
export function suggestCards(w: WorldState, me: Iso3): string[] {
  const c = w.countries[me];
  const lastEvent = w.history.at(-1)?.eventId ?? "";
  const scored = CARDS.filter((k) => k.id !== "diplomacy.proposeDeal")
    .map((k) => {
      const params = k.defaults ? k.defaults(w, me) : {};
      if (params === null || cardLegal(w, me, k.id, params) !== true) return null;
      let score = k.relevance(w, me);
      if (GROUP_BY_SCENARIO[w.scenario] === k.group) score += 10;
      if (lastEvent.startsWith(k.group)) score += 25;
      if (!c.shownCards.includes(k.id)) score += 5;
      if (c.lastCards.includes(k.id)) score -= 10;
      return { id: k.id, group: k.group, score };
    })
    .filter((x): x is { id: string; group: CardGroup; score: number } => x !== null);
  const tie = stream(w.seed, w.turn, `cards:${me}`);
  const keyed = scored.map((s) => ({ ...s, tie: tie() }));
  keyed.sort((a, b) => b.score - a.score || b.tie - a.tie || a.id.localeCompare(b.id));
  scored.splice(0, scored.length, ...keyed);
  const picked: typeof scored = [];
  const perGroup: Partial<Record<CardGroup, number>> = {};
  const crisis = (w.pendingCrises[me]?.length ?? 0) > 0 || (w.warnings[me]?.length ?? 0) > 0;
  const target = crisis ? 6 : 5;
  for (const s of scored) {
    if (picked.length >= target - 1) break;
    if ((perGroup[s.group] ?? 0) >= 2) continue;
    picked.push(s);
    perGroup[s.group] = (perGroup[s.group] ?? 0) + 1;
  }
  const opportunity = scored.find((s) => !perGroup[s.group]);
  if (opportunity) picked.push(opportunity);
  else {
    const next = scored.find((s) => !picked.includes(s));
    if (next) picked.push(next);
  }
  return [...picked.map((p) => p.id), "diplomacy.proposeDeal"];
}

export { surplus };
