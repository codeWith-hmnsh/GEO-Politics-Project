// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { answerProposal } from "../bots/decide";
import { closeTurn, playBotMatch, planBots } from "../match";
import { SEED_2026 } from "../seed";
import { whyChain } from "./causes";
import { CARDS, cardLegal, suggestCards } from "./cards";
import { CRISES, EVENTS_WITHOUT_CRISIS, SCENARIOS } from "./events";
import { createWorld } from "./init";
import { PROJECTS } from "./projects";
import { forecast, resolveTurn } from "./resolve";
import { mulberry32, stream } from "./rng";
import { TURNS } from "./rules";
import { leaderScore, MISSIONS, standings } from "./score";
import type { Proposal, ScenarioId, WorldState } from "./types";
import { SEATS } from "./types";

const world = (scenario: ScenarioId = "calmStart", seed = 1) => createWorld(SEED_2026, { matchId: `test-${scenario}-${seed}`, seed, scenario });

describe("rng", () => {
  it("is deterministic per seed and purpose", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(stream(1, 2, "x")()).not.toEqual(stream(1, 2, "y")());
  });
});

describe("start world", () => {
  it("has six seats with a power index and suggested cards", () => {
    const w = world();
    expect(Object.keys(w.countries).sort()).toEqual([...SEATS]);
    for (const s of SEATS) {
      expect(w.power[s][0]).toBeGreaterThan(30);
      const cards = w.countries[s].shownCards;
      expect(cards.length).toBeGreaterThanOrEqual(5);
      expect(cards.length).toBeLessThanOrEqual(7);
      expect(cards.at(-1)).toBe("diplomacy.proposeDeal");
    }
    expect(w.par).not.toBeNull();
  });

  it("is calibrated: a do-nothing calm year keeps growth close to the real start", () => {
    const w = world();
    const next = resolveTurn(w, {});
    for (const s of SEATS) expect(Math.abs(next.countries[s].growth - w.countries[s].growth)).toBeLessThan(0.6);
  });

  it("every scenario starts", () => {
    for (const id of Object.keys(SCENARIOS) as ScenarioId[]) expect(world(id).scenario).toBe(id);
  });
});

describe("determinism", () => {
  it("the same seed and orders give the same match", () => {
    const a = playBotMatch(world("energyShock", 7));
    const b = playBotMatch(world("energyShock", 7));
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    expect(a.ended).toBe(true);
    expect(a.history).toHaveLength(TURNS);
  });

  it("the engine never uses Math.random or Date.now", () => {
    const dir = __dirname;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"))) {
      const src = readFileSync(join(dir, f), "utf8");
      expect(src, f).not.toMatch(/Math\.random|Date\.now/);
    }
  });
});

describe("cards", () => {
  it("has 33 cards with unique ids", () => {
    expect(CARDS).toHaveLength(33);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(33);
  });

  it("every legal card resolves for every seat", () => {
    const w = world("energyShock");
    for (const s of SEATS)
      for (const card of CARDS) {
        const params = card.defaults ? card.defaults(w, s) : {};
        if (params === null || cardLegal(w, s, card.id, params) !== true) continue;
        expect(() => resolveTurn(w, { [s]: { cards: [{ cardId: card.id, params }] } }, [], { forecast: true }), `${s} ${card.id}`).not.toThrow();
      }
  });

  it("drops illegal cards with a reason", () => {
    const w = world();
    const next = resolveTurn(w, { IND: { cards: [{ cardId: "energy.raiseOutput", params: {} }] } });
    expect(next.history[0].dropped.some((d) => d.iso3 === "IND")).toBe(true);
  });

  it("suggests cards that match the situation", () => {
    const w = world("energyShock");
    expect(suggestCards(w, "JPN").some((id) => id.startsWith("energy."))).toBe(true);
  });
});

describe("projects", () => {
  it("every project can be built and completes", () => {
    for (const p of PROJECTS) {
      let w: WorldState = world();
      if (p.id === "pipeline") continue; // needs a treaty partner
      w = resolveTurn(w, { IND: { projects: [p.id] } });
      for (let i = 0; i < p.turns && !w.countries.IND.completed.includes(p.id); i++) w = resolveTurn(w, {});
      expect(w.countries.IND.completed, p.id).toContain(p.id);
    }
  });
});

describe("events, crises and votes", () => {
  it("every event has a crisis card with a valid default", () => {
    expect(EVENTS_WITHOUT_CRISIS).toEqual([]);
    for (const c of CRISES) expect(c.choices.some((x) => x.id === c.defaultChoice), c.id).toBe(true);
  });

  it("world events happen on event turns and create crisis cards", () => {
    let w = world("foodCrisis", 3);
    w = resolveTurn(w, {});
    w = resolveTurn(w, {});
    expect(w.history[1].eventId).toBeTruthy();
  });

  it("a World Vote is drawn for turn 3 and resolved", () => {
    let w = world();
    w = resolveTurn(resolveTurn(w, {}), {});
    expect(w.turn).toBe(3);
    expect(w.vote).not.toBeNull();
    const yes = Object.fromEntries(SEATS.map((s) => [s, { vote: "yes" as const }]));
    const after = resolveTurn(w, yes);
    expect(after.history.at(-1)!.vote?.passed).toBe(true);
    expect(after.resolutions.length).toBe(1);
  });
});

describe("diplomacy", () => {
  it("an accepted supply proposal becomes a treaty that moves goods, with a Why chain", () => {
    const w = world("energyShock");
    const p: Proposal = { id: "p1", turn: 1, from: "IND", to: "RUS", gives: [{ kind: "investment", amount: 12 }], wants: [{ kind: "goods", good: "energy", units: 4, priceAdj: -0.1 }], turns: 3, status: "accepted" };
    const next = resolveTurn(w, { IND: { proposalsSent: 1 } }, [p]);
    expect(next.treaties).toHaveLength(1);
    const flow = next.history[0].globe.find((g) => g.kind === "flow" && g.from === "RUS" && g.to === "IND");
    expect(flow).toBeTruthy();
    const ratio = next.history[0].causes.find((c) => c.field === "IND.energy.supplyRatio")!;
    const chain = whyChain(next.history[0].causes, ratio.id);
    expect(chain[0].sourceRef).toContain("T1-IND-RUS");
  });

  it("bots answer proposals", () => {
    const w = world("energyShock");
    const fair = answerProposal(w, { from: "IND", to: "RUS", gives: [{ kind: "investment", amount: 40 }], wants: [{ kind: "goods", good: "energy", units: 3, priceAdj: 0 }], turns: 3 });
    expect(["accepted", "countered"]).toContain(fair.status);
    const greedy = answerProposal(w, { from: "IND", to: "RUS", gives: [], wants: [{ kind: "goods", good: "energy", units: 20, priceAdj: -0.3 }], turns: 6 });
    expect(greedy.status).not.toBe("accepted");
  });

  it("sanctions break treaties and cost the sanctioner trust", () => {
    const w = world();
    const p: Proposal = { id: "p1", turn: 1, from: "JPN", to: "RUS", gives: [], wants: [{ kind: "goods", good: "energy", units: 2, priceAdj: 0 }], turns: 4, status: "accepted" };
    const t1 = resolveTurn(w, {}, [p]);
    const trustBefore = t1.pairs.CHN.JPN.trust;
    const t2 = resolveTurn(t1, { JPN: { cards: [{ cardId: "trade.sanction", params: { target: "RUS" } }] } });
    expect(t2.treaties).toHaveLength(0);
    expect(t2.pairs.CHN.JPN.trust).toBeLessThan(trustBefore);
  });
});

describe("forecast and scoring", () => {
  it("forecast does not change the world or write history", () => {
    const w = world();
    const f = forecast(w, "IND", { budget: { energy: 2 } });
    expect(w.turn).toBe(1);
    expect(f.history).toHaveLength(0);
  });

  it("a full match ends with standings and a score for every seat", () => {
    const w = playBotMatch(world("tradeWar", 11));
    const st = standings(w);
    expect(st).toHaveLength(6);
    for (const s of SEATS) {
      const ls = leaderScore(w, s);
      expect(ls.total).toBeGreaterThanOrEqual(0);
      expect(ls.total).toBeLessThanOrEqual(1000);
      expect(MISSIONS[s].text.length).toBeGreaterThan(10);
    }
  });

  it("a human seat can play alongside bots", () => {
    let w = world();
    const bots = SEATS.filter((s) => s !== "IND");
    const plan = planBots(w, bots, "normal");
    w = closeTurn(w, plan, { IND: { cards: [{ cardId: "people.skillsDrive", params: {} }] } }, []);
    expect(w.history[0].moves.IND).toBe("Skills Drive");
  });
});
