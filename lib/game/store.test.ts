// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moneyCommitted, pcLeft, useGame } from "./store";

const fresh = () => {
  useGame.setState({ phase: "pick", world: null, prev: null, orders: {}, proposals: [], tutorial: null, showcase: null });
  useGame.getState().setSetup({ me: "IND", scenario: "energyShock", difficulty: "normal", leader: "Test", portrait: 0, timed: false });
  useGame.getState().start();
};

describe("game store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fresh();
  });
  afterEach(() => vi.useRealTimers());

  it("starts a match in the planning phase with a goal and advisor moves", () => {
    const s = useGame.getState();
    expect(s.phase).toBe("plan");
    expect(s.world?.turn).toBe(1);
    expect(s.goal).not.toBeNull();
    expect(s.recs.length).toBeGreaterThan(0);
    expect(s.forecast).not.toBeNull();
  });

  it("tracks moves and money as orders are added and removed", () => {
    const g = useGame.getState();
    const total = pcLeft(g);
    g.addCard("people.skillsDrive", {});
    expect(pcLeft(useGame.getState())).toBe(total - 1);
    expect(moneyCommitted(useGame.getState())).toBeGreaterThan(0);
    useGame.getState().removeCard(0);
    expect(pcLeft(useGame.getState())).toBe(total);
    useGame.getState().addProject("oilReserve");
    expect(useGame.getState().orders.projects).toEqual(["oilReserve"]);
    useGame.getState().setBudget("energy", 2);
    useGame.getState().resetBudget();
    expect(useGame.getState().orders.budget).toBeUndefined();
  });

  it("applies an advisor recommendation", () => {
    const r = useGame.getState().recs[0];
    useGame.getState().applyRecommendation(r);
    const s = useGame.getState();
    const added = (s.orders.cards?.length ?? 0) + (s.orders.projects?.length ?? 0) + s.proposals.filter((p) => !p.inbox).length;
    expect(added).toBe(1);
  });

  it("sends a proposal and gets a bot answer", () => {
    useGame.getState().setCompose({ to: "RUS", gives: [{ kind: "investment", amount: 30 }], wants: [{ kind: "goods", good: "energy", units: 3, priceAdj: 0 }], turns: 3 });
    expect(useGame.getState().sendProposal()).toBeNull();
    expect(useGame.getState().proposals.find((p) => p.to === "RUS")?.thinking).toBe(true);
    vi.advanceTimersByTime(1200);
    const p = useGame.getState().proposals.find((x) => x.to === "RUS" && !x.counterOf)!;
    expect(p.thinking).toBe(false);
    expect(["accepted", "rejected", "countered"]).toContain(p.status);
    expect(useGame.getState().orders.proposalsSent).toBe(1);
  });

  it("locks, resolves with an impact report, and moves to the next year", () => {
    useGame.getState().addCard("people.skillsDrive", {});
    useGame.getState().lock();
    expect(useGame.getState().phase).toBe("locking");
    useGame.getState().resolve();
    let s = useGame.getState();
    expect(s.phase).toBe("reveal");
    expect(s.record?.year).toBe(2026);
    expect(s.impact).not.toBeNull();
    s.finishReveal();
    expect(useGame.getState().phase).toBe("result");
    useGame.getState().next();
    s = useGame.getState();
    expect(s.phase).toBe("plan");
    expect(s.world?.turn).toBe(2);
    expect(s.orders).toEqual({});
  });

  it("ends the match", () => {
    useGame.getState().quickFinish();
    const s = useGame.getState();
    expect(s.phase).toBe("end");
    expect(s.world?.ended).toBe(true);
  });

  it("only counts down when the timer is on", () => {
    const t0 = useGame.getState().timeLeft;
    useGame.getState().tick();
    expect(useGame.getState().timeLeft).toBe(t0);
    useGame.getState().setSetup({ timed: true });
    useGame.getState().tick();
    expect(useGame.getState().timeLeft).toBe(t0 - 1);
  });
});
