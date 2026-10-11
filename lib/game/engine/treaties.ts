// Proposals → treaties, money terms, expiry and broken promises (docs4.0/GAME-DESIGN.md §8).
import type { Ctx } from "./ctx";
import { RELATIONS, TRUST } from "./rules";
import type { Iso3, Proposal, Term, Treaty, WorldState } from "./types";
import { SEATS } from "./types";
import { clamp } from "./util";

export function rel(w: WorldState, a: Iso3, b: Iso3, by: number) {
  w.pairs[a][b].relations = clamp(w.pairs[a][b].relations + by, -100, 100);
}
export function relBoth(w: WorldState, a: Iso3, b: Iso3, by: number) {
  rel(w, a, b, by);
  rel(w, b, a, by);
}
export function trust(w: WorldState, a: Iso3, b: Iso3, by: number) {
  w.pairs[a][b].trust = clamp(w.pairs[a][b].trust + by, 0, 100);
}

export function termText(t: Term): string {
  switch (t.kind) {
    case "goods":
      return `${t.units} ${t.good} units/turn${t.priceAdj ? ` at ${t.priceAdj > 0 ? "+" : ""}${Math.round(t.priceAdj * 100)}%` : ""}`;
    case "money":
      return `$${t.amount}B grant`;
    case "investment":
      return `$${t.amount}B investment`;
    case "tariffCut":
      return "remove tariffs";
    case "pledge":
      return t.pledge === "noSanction" ? "pledge: no sanctions" : `pledge: stop buying from ${t.target}`;
  }
}

/** Phase 2a: accepted proposals of this turn become treaties; one-off money moves now. */
export function signTreaties(ctx: Ctx) {
  const { w } = ctx;
  for (const p of ctx.proposals) {
    if (p.status !== "accepted" || p.turn !== w.turn) continue;
    const t: Treaty = {
      id: `T${w.turn}-${p.from}-${p.to}-${p.id}`,
      a: p.from,
      b: p.to,
      aGives: p.gives,
      bGives: p.wants,
      turnsLeft: p.turns,
      startTurn: w.turn,
      prices: { ...ctx.start.price },
    };
    w.treaties.push(t);
    ctx.world.newTreaties++;
    const signed = ctx.causes.add(p.from, "treaty", 1, "treaty.signed", { actor: p.from, sourceRef: t.id });
    relBoth(w, p.from, p.to, RELATIONS.signed);
    trust(w, p.from, p.to, 3);
    trust(w, p.to, p.from, 3);
    payOneOff(ctx, t.a, t.b, t.aGives, signed);
    payOneOff(ctx, t.b, t.a, t.bGives, signed);
    for (const term of [...t.aGives, ...t.bGives]) {
      if (term.kind !== "tariffCut") continue;
      const giver = t.aGives.includes(term) ? t.a : t.b;
      const other = giver === t.a ? t.b : t.a;
      w.pairs[giver][other].tariff = 0;
    }
    ctx.setMove(p.from, `Treaty with ${w.countries[p.to].name}`);
    ctx.setMove(p.to, `Treaty with ${w.countries[p.from].name}`);
    ctx.globe.push({ kind: "treaty", from: p.from, to: p.to });
    ctx.addNews({
      headline: `${w.countries[p.from].name} and ${w.countries[p.to].name} sign a ${p.turns}-year pact`,
      icon: "diplomacy",
      iso3: p.from,
      weight: 6,
    });
  }
}

function payOneOff(ctx: Ctx, giver: Iso3, receiver: Iso3, terms: Term[], parent: string) {
  const g = ctx.w.countries[giver];
  const r = ctx.w.countries[receiver];
  for (const t of terms) {
    if (t.kind === "money") {
      g.treasury -= t.amount;
      r.treasury += t.amount;
      ctx.causes.add(giver, "treasury", -t.amount, "treaty.grantPaid", { actor: giver, parent });
      ctx.causes.add(receiver, "treasury", t.amount, "treaty.grantReceived", { actor: giver, parent });
    }
    if (t.kind === "investment") {
      g.treasury -= t.amount;
      const pct = (t.amount / r.gdp) * 100;
      const infra = Math.min(6, pct * 3);
      const ind = Math.min(4, pct * 2);
      r.infrastructure = clamp(r.infrastructure + infra);
      r.industry = clamp(r.industry + ind);
      ctx.s[receiver].investmentReceivedPct += pct;
      ctx.causes.add(giver, "treasury", -t.amount, "treaty.investmentSent", { actor: giver, parent });
      ctx.causes.add(receiver, "infrastructure", infra, "treaty.investmentReceived", { actor: giver, parent });
    }
  }
}

/** Break a treaty. `by` is the leader who broke it (null when it ends because of a sanction both sides caused). */
export function breakTreaty(ctx: Ctx, t: Treaty, by: Iso3, reason: string) {
  const { w } = ctx;
  w.treaties = w.treaties.filter((x) => x.id !== t.id);
  const partner = t.a === by ? t.b : t.a;
  trust(w, partner, by, TRUST.brokenPartner);
  rel(w, partner, by, RELATIONS.broken);
  for (const s of SEATS) if (s !== by && s !== partner) trust(w, s, by, TRUST.brokenOthers);
  const c = w.countries[by];
  c.influence = clamp(c.influence - 5);
  ctx.causes.add(by, "influence", -5, "treaty.broken", { actor: by, sourceRef: t.id });
  ctx.addNews({ headline: `${c.name} breaks its pact with ${w.countries[partner].name} (${reason})`, icon: "diplomacy", iso3: by, weight: 8 });
}

/** Phase 2b: pledges broken by this turn's own actions. Called after cards. */
export function checkPledges(ctx: Ctx) {
  const { w } = ctx;
  for (const t of [...w.treaties]) {
    for (const [giver, terms] of [
      [t.a, t.aGives],
      [t.b, t.bGives],
    ] as [Iso3, Term[]][]) {
      const other = giver === t.a ? t.b : t.a;
      for (const term of terms) {
        if (term.kind !== "pledge") continue;
        if (term.pledge === "noSanction" && w.pairs[giver][other].sanction) breakTreaty(ctx, t, giver, "sanction despite a pledge");
        if (term.pledge === "noBuyFrom" && term.target && w.treaties.some((x) => x.startTurn === w.turn && ((x.a === giver && x.b === term.target) || (x.b === giver && x.a === term.target))))
          breakTreaty(ctx, t, giver, `new deal with ${term.target}`);
      }
    }
  }
}

/** After goods flow: count down; finished treaties reward both sides. */
export function ageTreaties(ctx: Ctx) {
  const { w } = ctx;
  for (const t of w.treaties) {
    t.turnsLeft--;
    rel(w, t.a, t.b, RELATIONS.perTreaty);
    rel(w, t.b, t.a, RELATIONS.perTreaty);
  }
  const done = w.treaties.filter((t) => t.turnsLeft <= 0);
  w.treaties = w.treaties.filter((t) => t.turnsLeft > 0);
  for (const t of done) {
    trust(w, t.a, t.b, TRUST.kept);
    trust(w, t.b, t.a, TRUST.kept);
    for (const s of [t.a, t.b]) {
      w.countries[s].influence = clamp(w.countries[s].influence + 1);
      ctx.s[s].treatiesKept++;
    }
    ctx.addNews({ headline: `${w.countries[t.a].name}–${w.countries[t.b].name} pact completed in full`, icon: "diplomacy", iso3: t.a, weight: 3 });
  }
}

/** Value of a set of terms to the receiver, in $B over the treaty's life, at the current world price. Used by bots. */
export function termsValue(w: WorldState, receiver: Iso3, terms: Term[], turns: number): number {
  let v = 0;
  const c = w.countries[receiver];
  for (const t of terms) {
    if (t.kind === "goods") {
      const g = c.goods[t.good];
      const need = Math.max(0, g.demand - g.prod);
      const useful = Math.min(t.units, need + 1);
      const unit = (w.price[t.good] / 100) * (t.good === "energy" ? 12 : t.good === "food" ? 8 : 20);
      // receiving goods you need saves the market premium and secures supply
      v += turns * (useful * unit * (0.15 - t.priceAdj) + (t.units - useful) * unit * -t.priceAdj);
    } else if (t.kind === "money") v += t.amount;
    else if (t.kind === "investment") v += t.amount * 1.3;
    else if (t.kind === "tariffCut") v += c.gdp * 0.001 * turns;
    else if (t.kind === "pledge") v += c.gdp * 0.0008 * turns;
  }
  return v;
}

/** Cost of giving a set of terms, from the giver's point of view. */
export function termsCost(w: WorldState, giver: Iso3, terms: Term[], turns: number): number {
  let v = 0;
  const c = w.countries[giver];
  for (const t of terms) {
    if (t.kind === "goods") {
      const g = c.goods[t.good];
      const spare = Math.max(0, g.prod - g.demand);
      const unit = (w.price[t.good] / 100) * (t.good === "energy" ? 12 : t.good === "food" ? 8 : 20);
      const fromSpare = Math.min(t.units, spare);
      // selling spare at a discount costs the discount; selling what you need costs a lot
      v += turns * (fromSpare * unit * Math.max(0, -t.priceAdj) + (t.units - fromSpare) * unit * 0.6);
      v -= turns * fromSpare * unit * 0.05; // a steady buyer is worth something
    } else if (t.kind === "money" || t.kind === "investment") v += t.amount;
    else if (t.kind === "tariffCut") v += c.gdp * 0.0006 * turns;
    else if (t.kind === "pledge") v += c.gdp * 0.0005 * turns;
  }
  return v;
}

export function proposalLegal(w: WorldState, p: Pick<Proposal, "from" | "to" | "gives" | "wants" | "turns">): true | string {
  if (p.from === p.to) return "Cannot propose to yourself";
  if (p.turns < 1 || p.turns > 6) return "Duration must be 1–6 turns";
  if (p.gives.length + p.wants.length === 0) return "Empty proposal";
  if (w.pairs[p.from][p.to].sanction || w.pairs[p.to][p.from].sanction) return "Sanctions block deals";
  for (const [owner, terms] of [
    [p.from, p.gives],
    [p.to, p.wants],
  ] as [Iso3, Term[]][]) {
    for (const t of terms) {
      if (t.kind === "goods" && (t.units <= 0 || t.units > 30)) return "Goods units must be 1–30";
      if (t.kind === "goods" && Math.abs(t.priceAdj) > 0.3) return "Price change must be within ±30%";
      if ((t.kind === "money" || t.kind === "investment") && (t.amount <= 0 || t.amount > w.countries[owner].gdp * 0.03)) return "Money must be positive and at most 3% of GDP";
    }
  }
  return true;
}
