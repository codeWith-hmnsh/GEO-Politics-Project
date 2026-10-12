// Solo match state for /play (BUILD-PLAN S3). The engine runs in the browser; this store holds the session.

import { create } from "zustand";
import { recommend, yearGoal, type Goal, type Recommendation } from "./advisor";
import type { Difficulty } from "./bots/decide";
import { CARD_BY_ID, cardCost } from "./engine/cards";
import { createWorld } from "./engine/init";
import { projectCost, PROJECT_BY_ID } from "./engine/projects";
import { forecast } from "./engine/resolve";
import { TURN_SECONDS } from "./engine/rules";
import type { CardParams, Good, Iso3, Ministry, Proposal, RegionId, ScenarioId, Term, TurnOrders, TurnRecord, WorldState } from "./engine/types";
import { SEATS } from "./engine/types";
import { answerHumanProposal, closeTurn, planBots, type Plan } from "./match";
import type { MatchView, NetOps, SeatView } from "./onlineTypes";
import { SEED_2026 } from "./seed";
import { sound } from "./sound";

export type Phase = "pick" | "plan" | "locking" | "reveal" | "result" | "end";
export type Tab = "year" | "moves" | "deals" | "advanced";

export type UIProposal = Proposal & { inbox?: boolean; counterOf?: string; thinking?: boolean };

export interface Compose {
  to: Iso3 | null;
  gives: Term[];
  wants: Term[];
  turns: number;
  free?: boolean;
  parentId?: string;
}

export interface Setup {
  me: Iso3;
  scenario: ScenarioId;
  difficulty: Difficulty;
  leader: string;
  portrait: number;
  timed: boolean;
}

/** Temporary globe effects driven by the reveal. */
export interface Fx {
  arcs: { key: string; from: Iso3; to: Iso3; kind: "flow" | "sanction"; good?: Good }[];
  regions: RegionId[];
  event: [number, number] | null;
}

export interface Impact {
  growth: number;
  unemployment: number;
  inflation: number;
  stability: number;
  energy: number;
  food: number;
  treasury: number;
  power: number;
}

interface GameState {
  phase: Phase;
  setup: Setup;
  world: WorldState | null;
  prev: WorldState | null;
  plan: Plan | null;
  orders: TurnOrders;
  proposals: UIProposal[];
  tab: Tab;
  timeLeft: number;
  paused: boolean;
  botLocks: Partial<Record<Iso3, boolean>>;
  forecast: WorldState | null;
  goal: Goal | null;
  recs: Recommendation[];
  /** Your moves vs. doing nothing this year (the clearest answer to "did my decisions matter?"). */
  impact: Impact | null;
  record: TurnRecord | null;
  worldView: boolean;
  compose: Compose | null;
  tutorial: number | null;
  fx: Fx;
  /** Play page story: what the globe shows outside a match (your country, arcs, tinted regions). */
  showcase: { me: Iso3; arcs: Fx["arcs"]; regions: { id: RegionId; seat: Iso3; strength: number }[] } | null;
  setShowcase: (s: GameState["showcase"]) => void;

  setSetup: (p: Partial<Setup>) => void;
  start: () => void;
  setTab: (t: Tab) => void;
  addCard: (cardId: string, params: CardParams) => void;
  removeCard: (index: number) => void;
  setBudget: (m: Ministry, v: number | null) => void;
  setTax: (v: number | null) => void;
  resetBudget: () => void;
  addProject: (id: string) => void;
  removeProject: (id: string) => void;
  setVote: (v: "yes" | "no" | "abstain" | null) => void;
  chooseCrisis: (id: string, choice: string) => void;
  setCompose: (c: Compose | null) => void;
  sendProposal: () => string | null;
  answerInbox: (id: string, act: "accept" | "reject" | "counter" | "acceptCounter" | "rejectCounter") => void;
  applyRecommendation: (r: Recommendation) => void;
  tick: () => void;
  togglePause: () => void;
  toggleWorldView: () => void;
  lock: () => void;
  markBotLocked: (s: Iso3) => void;
  resolve: () => void;
  finishReveal: () => void;
  next: () => void;
  quickFinish: () => void;
  refreshForecast: () => void;
  setTutorial: (step: number | null) => void;
  setFx: (fx: Partial<Fx>) => void;

  // ── multiplayer (docs4.0/MULTIPLAYER.md §4) ──
  net: NetOps | null;
  seats: SeatView[];
  view: MatchView | null;
  /** Server clock minus local clock, in ms. */
  skew: number;
  netError: string | null;
  setNet: (net: NetOps | null) => void;
  syncView: (v: MatchView) => void;
  setNetError: (e: string | null) => void;
}

const bots = (me: Iso3) => SEATS.filter((s) => s !== me);
const strip = (p: UIProposal): Proposal => ({ id: p.id, turn: p.turn, from: p.from, to: p.to, gives: p.gives, wants: p.wants, turns: p.turns, status: p.status, parentId: p.parentId });

function tutorialStart(): number | null {
  try {
    return localStorage.getItem("statecraft-tutorial-done") === "1" ? null : 0;
  } catch {
    return 0;
  }
}

export const pcLeft = (s: Pick<GameState, "world" | "setup" | "orders">) => {
  if (!s.world) return 0;
  const used = (s.orders.cards ?? []).reduce((t, c) => t + (CARD_BY_ID.get(c.cardId)?.pc ?? 0), 0) + (s.orders.proposalsSent ?? 0);
  return s.world.countries[s.setup.me].pc - used;
};

export const moneyCommitted = (s: Pick<GameState, "world" | "setup" | "orders">) => {
  if (!s.world) return 0;
  const w = s.world;
  const me = s.setup.me;
  let m = 0;
  for (const k of s.orders.cards ?? []) m += cardCost(w, me, CARD_BY_ID.get(k.cardId)!, k.params);
  for (const p of s.orders.projects ?? []) m += projectCost(w.countries[me], p) / PROJECT_BY_ID.get(p)!.turns;
  return m;
};

function snapImpact(w: WorldState, me: Iso3, power: number): Impact {
  const c = w.countries[me];
  return { growth: c.growth, unemployment: c.unemployment, inflation: c.inflation, stability: c.stability, energy: c.goods.energy.supplyRatio * 100, food: c.goods.food.supplyRatio * 100, treasury: c.treasury, power };
}

export const useGame = create<GameState>((set, get) => {
  const beginTurn = (world: WorldState) => {
    const { setup } = get();
    const plan = planBots(world, bots(setup.me), setup.difficulty);
    const inbox: UIProposal[] = plan.proposals.filter((p) => p.to === setup.me && p.status === "pending").map((p) => ({ ...p, inbox: true }));
    const goal = yearGoal(world, setup.me);
    set({
      world,
      plan,
      orders: {},
      proposals: inbox,
      phase: "plan",
      tab: "year",
      timeLeft: TURN_SECONDS(world.turn),
      botLocks: {},
      goal,
      recs: recommend(world, setup.me, {}, inbox, goal),
      compose: null,
      record: null,
      impact: null,
    });
    get().refreshForecast();
  };

  const changed = () => {
    get().refreshForecast();
  };

  /** Show a multiplayer turn from the server's view (no local bots: the server plans them). */
  const enterOnline = (v: MatchView) => {
    const me = v.me;
    const seat = v.seats.find((x) => x.you);
    const world = v.world!;
    set((s) => ({ setup: { ...s.setup, me, leader: seat?.leader ?? s.setup.leader, portrait: seat?.portrait ?? s.setup.portrait, timed: true, scenario: v.match.scenario, difficulty: v.match.difficulty }, tutorial: null }));
    if (v.match.phase === "ended" || world.ended) {
      set({ world, prev: get().world ?? world, phase: "end" });
      return;
    }
    const inbox = v.proposals as UIProposal[];
    const goal = yearGoal(world, me);
    set({ world, plan: null, orders: v.orders ?? {}, proposals: inbox, phase: seat?.locked ? "locking" : "plan", tab: "year", goal, recs: recommend(world, me, v.orders ?? {}, inbox, goal), compose: null, record: null, impact: null, fx: { arcs: [], regions: [], event: null } });
    get().refreshForecast();
  };

  return {
    phase: "pick",
    setup: { me: "IND", scenario: "energyShock", difficulty: "normal", leader: "", portrait: 0, timed: false },
    world: null,
    prev: null,
    plan: null,
    orders: {},
    proposals: [],
    tab: "year",
    timeLeft: 0,
    paused: false,
    botLocks: {},
    forecast: null,
    goal: null,
    recs: [],
    impact: null,
    record: null,
    worldView: false,
    compose: null,
    tutorial: null,
    fx: { arcs: [], regions: [], event: null },
    showcase: null,
    setShowcase: (showcase) => set({ showcase }),

    setSetup: (p) => set((s) => ({ setup: { ...s.setup, ...p } })),
    start: () => {
      const { setup } = get();
      const seed = Math.floor(Math.random() * 1e9);
      const world = createWorld(SEED_2026, { matchId: `solo-${seed}`, seed, scenario: setup.scenario });
      set({ prev: null, tutorial: tutorialStart(), worldView: false, paused: false });
      beginTurn(world);
      sound.chime();
    },
    setTab: (tab) => set({ tab }),
    addCard: (cardId, params) => {
      set((s) => ({ orders: { ...s.orders, cards: [...(s.orders.cards ?? []), { cardId, params }] } }));
      sound.place();
      changed();
    },
    removeCard: (i) => {
      set((s) => ({ orders: { ...s.orders, cards: (s.orders.cards ?? []).filter((_, k) => k !== i) } }));
      changed();
    },
    setBudget: (m, v) => {
      set((s) => {
        const b = { ...(s.orders.budget ?? {}) };
        if (v === null) delete b[m];
        else b[m] = v;
        const orders = { ...s.orders, budget: Object.keys(b).length ? b : undefined };
        return { orders };
      });
      changed();
    },
    setTax: (v) => {
      set((s) => ({ orders: { ...s.orders, taxRate: v ?? undefined } }));
      changed();
    },
    resetBudget: () => {
      set((s) => ({ orders: { ...s.orders, budget: undefined, taxRate: undefined } }));
      changed();
    },
    addProject: (id) => {
      set((s) => ({ orders: { ...s.orders, projects: [...(s.orders.projects ?? []), id] } }));
      sound.place();
      changed();
    },
    removeProject: (id) => {
      set((s) => ({ orders: { ...s.orders, projects: (s.orders.projects ?? []).filter((x) => x !== id) } }));
      changed();
    },
    setVote: (v) => {
      set((s) => ({ orders: { ...s.orders, vote: v ?? undefined } }));
      if (v) sound.place();
    },
    chooseCrisis: (id, choice) => {
      set((s) => ({ orders: { ...s.orders, crisis: { ...(s.orders.crisis ?? {}), [id]: choice } } }));
      sound.place();
      changed();
    },
    setCompose: (compose) => set({ compose }),
    sendProposal: () => {
      const { compose, world, setup, proposals, net } = get();
      if (!compose?.to || !world) return "Choose a country";
      if (net) {
        const temp: UIProposal = { id: `local-${Date.now()}`, turn: world.turn, from: setup.me, to: compose.to, gives: compose.gives, wants: compose.wants, turns: compose.turns, status: "pending", thinking: true };
        set((s) => ({ proposals: [...s.proposals, temp], compose: null }));
        sound.place();
        net
          .call("propose", { to: compose.to, gives: compose.gives, wants: compose.wants, turns: compose.turns, parentId: compose.parentId })
          .then(() => sound.knock())
          .catch((e: Error) => {
            set((s) => ({ proposals: s.proposals.filter((x) => x.id !== temp.id), netError: e.message }));
          })
          .finally(() => net.refresh());
        return null;
      }
      const p: UIProposal = { id: `${world.turn}-${setup.me}-${compose.to}-h${proposals.length}`, turn: world.turn, from: setup.me, to: compose.to, gives: compose.gives, wants: compose.wants, turns: compose.turns, status: "pending", parentId: compose.parentId, thinking: true };
      set((s) => ({ proposals: [...s.proposals, p], compose: null, orders: compose.free ? s.orders : { ...s.orders, proposalsSent: (s.orders.proposalsSent ?? 0) + 1 } }));
      sound.place();
      setTimeout(() => {
        const w = get().world;
        if (!w) return;
        const out = answerHumanProposal(w, strip(p));
        set((s) => ({
          proposals: [
            ...s.proposals.map((x) => (x.id === p.id ? { ...x, thinking: false, status: out[0].status } : x)),
            ...(out[1] ? [{ ...out[1], counterOf: p.id, status: "pending" as const }] : []),
          ],
        }));
        sound.knock();
        changed();
      }, 1100);
      return null;
    },
    answerInbox: (id, act) => {
      const p = get().proposals.find((x) => x.id === id);
      if (!p) return;
      const net = get().net;
      if (net) {
        const action = act === "accept" || act === "acceptCounter" ? "accept" : act === "counter" ? "counter" : "reject";
        if (act === "counter") set({ compose: { to: p.from, gives: p.wants.map((t) => ({ ...t })), wants: p.gives.map((t) => ({ ...t })), turns: p.turns, free: true, parentId: p.id }, tab: "deals" });
        set((s) => ({ proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: action === "accept" ? "accepted" : action === "counter" ? "countered" : "rejected" } : x)) }));
        if (action === "accept") sound.chime();
        net
          .call("answer", { id, action })
          .catch((e: Error) => set({ netError: e.message }))
          .finally(() => net.refresh());
        changed();
        return;
      }
      if (act === "counter") {
        set((s) => ({
          proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: "countered" } : x)),
          compose: { to: p.from, gives: p.wants.map((t) => ({ ...t })), wants: p.gives.map((t) => ({ ...t })), turns: p.turns, free: true, parentId: p.id },
          tab: "deals",
        }));
        return;
      }
      const status = act === "accept" || act === "acceptCounter" ? "accepted" : "rejected";
      set((s) => ({ proposals: s.proposals.map((x) => (x.id === id ? { ...x, status } : x)) }));
      if (status === "accepted") sound.chime();
      changed();
    },
    applyRecommendation: (r) => {
      if (r.kind === "card") get().addCard(r.id, r.params);
      else if (r.kind === "project") get().addProject(r.id);
      else {
        set({ compose: { to: r.to, gives: r.gives, wants: r.wants, turns: r.turns } });
        get().sendProposal();
      }
      const { world, setup, orders, proposals, goal } = get();
      if (world && goal) set({ recs: recommend(world, setup.me, orders, proposals, goal) });
    },
    tick: () => {
      const s = get();
      if (s.net) {
        const d = s.view?.match.deadlineAt;
        if (!d || (s.phase !== "plan" && s.phase !== "locking")) return;
        const left = Math.max(0, Math.round((Date.parse(d) - (Date.now() + s.skew)) / 1000));
        set({ timeLeft: left });
        // any player may ask the server to resolve once the deadline has passed (MULTIPLAYER §4.1)
        if (left === 0) s.net.call("resolve").catch(() => {}).finally(() => s.net?.refresh());
        return;
      }
      if (s.phase !== "plan" || s.paused || !s.setup.timed) return;
      const t = Math.max(0, s.timeLeft - 1);
      set({ timeLeft: t });
      if (t === 0) s.lock();
    },
    togglePause: () => set((s) => ({ paused: !s.paused })),
    toggleWorldView: () => set((s) => ({ worldView: !s.worldView })),
    lock: () => {
      if (get().phase !== "plan") return;
      set({ phase: "locking", compose: null });
      sound.lock();
      const net = get().net;
      if (net)
        net
          .call("orders", { orders: get().orders })
          .then(() => net.call("lock", { locked: true }))
          .catch((e: Error) => set({ phase: "plan", netError: e.message }))
          .finally(() => net.refresh());
    },
    markBotLocked: (s) => set((st) => ({ botLocks: { ...st.botLocks, [s]: true } })),
    resolve: () => {
      const { world, plan, orders, proposals, setup } = get();
      if (!world || !plan) return;
      const accepted = proposals.filter((p) => p.status === "accepted").map(strip);
      const next = closeTurn(world, plan, { [setup.me]: orders }, accepted);
      // counterfactual: the same year with your orders and your deals removed
      const withoutMe = closeTurn(world, plan, { [setup.me]: {} }, accepted.filter((p) => p.from !== setup.me && p.to !== setup.me));
      const impactFor = (w: WorldState) => snapImpact(w, setup.me, w.power[setup.me].at(-1) ?? 0);
      const a = impactFor(next);
      const b = impactFor(withoutMe);
      const impact = Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Impact] - b[k as keyof Impact]])) as unknown as Impact;
      set({ prev: world, world: next, record: next.history.at(-1) ?? null, impact, phase: "reveal" });
    },
    finishReveal: () => set({ phase: "result", tab: "year" }),
    next: () => {
      const w = get().world;
      if (!w) return;
      const v = get().view;
      if (get().net && v) {
        if (v.match.phase === "ended" || w.ended) set({ phase: "end" });
        else if (v.world) enterOnline(v);
        return;
      }
      if (w.ended) set({ phase: "end" });
      else beginTurn(w);
    },
    quickFinish: () => {
      // demo helper: bots play your seat too until the end
      let w = get().world;
      if (!w) return;
      while (!w.ended) w = closeTurn(w, planBots(w, [...SEATS], "normal"), {}, []);
      set({ prev: get().world, world: w, phase: "end" });
    },
    refreshForecast: () => {
      const { world, setup, orders, proposals } = get();
      if (!world) return;
      const accepted = proposals.filter((p) => p.status === "accepted").map(strip);
      set({ forecast: forecast(world, setup.me, orders, accepted) });
    },
    setFx: (fx) => set((s) => ({ fx: { ...s.fx, ...fx } })),

    net: null,
    seats: [],
    view: null,
    skew: 0,
    netError: null,
    setNet: (net) => set({ net }),
    setNetError: (netError) => set({ netError }),
    syncView: (v) => {
      const s = get();
      const skew = Date.parse(v.match.serverNow) - Date.now();
      const botLocks = Object.fromEntries(v.seats.filter((x) => x.locked && !x.you).map((x) => [x.iso3, true]));
      set({ view: v, seats: v.seats, skew, botLocks });
      if (!v.world) return;
      const local = s.world;
      // first view of this match
      if (!local || s.phase === "pick") return enterOnline(v);
      // the server resolved the turn this player was planning: play the reveal
      if ((s.phase === "plan" || s.phase === "locking") && v.lastRecord && v.lastRecord.turn === local.turn) {
        set({ prev: local, world: v.world, record: v.lastRecord, impact: (v.lastRecord.impact?.[s.setup.me] as Impact | undefined) ?? null, phase: "reveal", compose: null, fx: { arcs: [], regions: [], event: null } });
        return;
      }
      if ((s.phase === "plan" || s.phase === "locking") && v.match.turn === local.turn) {
        // keep local "thinking" placeholders until the server has the real proposal
        const server = v.proposals.map((p) => ({ ...p }) as UIProposal);
        const pending = s.proposals.filter((p) => p.id.startsWith("local-") && !server.some((x) => x.from === p.from && x.to === p.to));
        set({ proposals: [...server, ...pending] });
        const mine = v.seats.find((x) => x.you);
        if (s.phase === "plan" && mine?.locked) set({ phase: "locking" });
      }
    },
    setTutorial: (step) => {
      if (step === null) {
        try {
          localStorage.setItem("statecraft-tutorial-done", "1");
        } catch {
          // optional
        }
      }
      set({ tutorial: step });
    },
  };
});

