// resolveTurn and forecast (docs4.0/SYSTEMS.md §10, §13). Pure: same input, same output.
import { suggestCards } from "./cards";
import { Ctx } from "./ctx";
import { phaseBudget, phaseCards, phaseDiplomacy, phaseGoods, phaseMacro, phasePeople, phaseProjects, phaseTreaties, phaseWorld } from "./phases";
import { RATINGS } from "./types";
import { PC_CAP, PC_CARRY_MAX, PC_PER_TURN, TURNS, VOTE_TURNS } from "./rules";
import { dimensions, powerIndex, ranks } from "./score";
import type { Iso3, Proposal, TurnOrders, TurnRecord, Warning, WorldState } from "./types";
import { SEATS } from "./types";
import { clone, roundCountry } from "./util";
import { drawResolution } from "./votes";

export interface ResolveOptions {
  /** Forecast mode: no world event, no warnings, no history; used for previews and warnings. */
  forecast?: boolean;
}

export function resolveTurn(state: WorldState, orders: Partial<Record<Iso3, TurnOrders>>, proposals: Proposal[] = [], opts: ResolveOptions = {}): WorldState {
  if (state.ended) return state;
  const start = state;
  const w = clone(state);
  const full = Object.fromEntries(SEATS.map((s) => [s, orders[s] ?? {}])) as Record<Iso3, TurnOrders>;
  const ctx = new Ctx(w, start, full, proposals, !!opts.forecast);

  phaseTreaties(ctx); // 2
  phaseBudget(ctx); // 3
  phaseProjects(ctx); // 4
  phaseCards(ctx); // 5
  phaseWorld(ctx); // 6
  phaseGoods(ctx); // 7
  phaseMacro(ctx); // 8
  phasePeople(ctx); // 9
  phaseDiplomacy(ctx); // 10

  // 11. scores
  for (const s of SEATS) {
    roundCountry(w.countries[s]);
    const d = dimensions(w, s);
    w.dims[s].push(d);
    w.power[s].push(Math.round(powerIndex(d) * 100) / 100);
  }

  if (opts.forecast) return w;

  // 12. output
  const r0 = ranks(start);
  const r1 = ranks(w);
  for (const s of SEATS) {
    if (r1[s] < r0[s]) ctx.addNews({ headline: `${w.countries[s].name} climbs to #${r1[s]} in the World Power Index`, icon: "economy", iso3: s, weight: 4 + (r0[s] - r1[s]) });
    const c = w.countries[s];
    const unused = Math.max(0, start.countries[s].pc - ctx.s[s].pcSpent);
    c.pc = Math.min(PC_CAP, PC_PER_TURN + Math.min(PC_CARRY_MAX, unused)) - (c.flags.includes("govCrisis") ? 2 : c.flags.includes("unrest") ? 1 : 0);
    c.pc = Math.max(1, c.pc);
  }

  const deltas = Object.fromEntries(
    SEATS.map((s) => {
      const a = start.countries[s];
      const b = w.countries[s];
      return [
        s,
        {
          gdp: b.gdp - a.gdp,
          growth: b.growth - a.growth,
          unemployment: b.unemployment - a.unemployment,
          inflation: b.inflation - a.inflation,
          treasury: b.treasury - a.treasury,
          stability: b.stability - a.stability,
          industry: b.industry - a.industry,
          influence: b.influence - a.influence,
          energy: (b.goods.energy.supplyRatio - a.goods.energy.supplyRatio) * 100,
          food: (b.goods.food.supplyRatio - a.goods.food.supplyRatio) * 100,
          tech: (b.goods.tech.supplyRatio - a.goods.tech.supplyRatio) * 100,
          power: (w.power[s].at(-1) ?? 0) - (start.power[s].at(-1) ?? 0),
          rank: r0[s] - r1[s],
        },
      ];
    }),
  );

  for (const s of SEATS) ctx.setMove(s, "Held steady");
  const record: TurnRecord = {
    turn: w.turn,
    year: w.year,
    moves: ctx.moves,
    causes: ctx.causes.items,
    news: [...ctx.news].sort((a, b) => b.weight - a.weight).slice(0, 8),
    globe: ctx.globe,
    dropped: ctx.dropped,
    eventId: ctx.eventId,
    vote: start.vote ? w.vote ?? undefined : undefined,
    completed: ctx.completed,
    deltas,
  };
  w.history.push(record);
  w.vote = null;

  // next turn
  w.turn += 1;
  w.year += 1;
  if (w.turn > TURNS) {
    w.ended = true;
    return w;
  }
  if (VOTE_TURNS.includes(w.turn)) w.vote = drawResolution(w);
  w.warnings = computeWarnings(w);
  for (const s of SEATS) w.countries[s].shownCards = suggestCards(w, s);
  return w;
}

/** Preview the player's own orders with no reactions from others and no event (SYSTEMS §13). */
export function forecast(state: WorldState, me: Iso3, orders: TurnOrders, proposals: Proposal[] = []): WorldState {
  return resolveTurn(state, { [me]: orders }, proposals, { forecast: true });
}

/** Warnings one turn early: a no-orders forecast crossing a threshold (GAME-DESIGN §10.1). */
export function computeWarnings(w: WorldState): Partial<Record<Iso3, Warning[]>> {
  const f = resolveTurn({ ...w, vote: null }, {}, [], { forecast: true });
  const out: Partial<Record<Iso3, Warning[]>> = {};
  for (const s of SEATS) {
    const now = w.countries[s];
    const next = f.countries[s];
    const list: (Warning & { sev: number })[] = [];
    if (next.stability < 35) list.push({ id: "protests", text: `Protests growing: stability ${Math.round(next.stability)} next year`, cards: ["people.cashTransfers", "people.jobsGuarantee", "energy.fuelSubsidy"], sev: 50 - next.stability });
    if (RATINGS.indexOf(next.rating) > RATINGS.indexOf(now.rating)) list.push({ id: "debt", text: `Debt alarm: rating may fall to ${next.rating}`, cards: ["economy.austerity", "economy.imf"], sev: 20 });
    for (const g of ["energy", "food"] as const)
      if (next.goods[g].supplyRatio < 0.9) list.push({ id: "shortage", text: `Shortage ahead: ${g} supply ${Math.round(next.goods[g].supplyRatio * 100)}%`, cards: [g === "energy" ? "energy.secureImports" : "food.emergencyImports", "food.releaseReserves", "diplomacy.proposeDeal"], sev: (1 - next.goods[g].supplyRatio) * 100 });
    if (next.unemployment - now.unemployment >= 1) list.push({ id: "jobs", text: `Jobs crisis: unemployment ${next.unemployment.toFixed(1)}% next year`, cards: ["people.jobsGuarantee", "economy.sez"], sev: 15 });
    if (next.inflation > 8) list.push({ id: "prices", text: `Prices rising: inflation ${next.inflation.toFixed(1)}% next year`, cards: ["economy.austerity", "trade.cutTariffs"], sev: next.inflation });
    const top = list.sort((a, b) => b.sev - a.sev).slice(0, 2).map(({ id, text, cards }) => ({ id, text, cards }));
    if (top.length) out[s] = top;
  }
  return out;
}
