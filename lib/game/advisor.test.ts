// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contracted, recommend, suggestDeal, yearGoal } from "./advisor";
import { createWorld } from "./engine/init";
import { resolveTurn } from "./engine/resolve";
import type { Proposal } from "./engine/types";
import { SEED_2026 } from "./seed";

const world = (scenario: "energyShock" | "calmStart" = "energyShock") => createWorld(SEED_2026, { matchId: `adv-${scenario}`, seed: 5, scenario });

describe("advisor", () => {
  it("gives India an oil-shock goal in an Energy Shock", () => {
    const g = yearGoal(world(), "IND");
    expect(g.id).toBe("oilShock");
    expect(g.metric?.label).toMatch(/contract/);
  });

  it("falls back to the mission in a calm world", () => {
    const g = yearGoal(world("calmStart"), "USA");
    expect(["mission", "budget", "stability"]).toContain(g.id);
  });

  it("recommends up to three moves, each with an effect and a cost", () => {
    const w = world();
    const recs = recommend(w, "IND", {}, [], yearGoal(w, "IND"));
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
    for (const r of recs) {
      expect(r.effect.length).toBeGreaterThan(5);
      expect(r.cost.length).toBeGreaterThan(0);
    }
    expect(recs.filter((r) => r.kind === "card").length).toBeLessThanOrEqual(2);
    expect(recs.some((r) => r.kind === "deal")).toBe(true);
  });

  it("suggests a deal with a seller that has spare energy", () => {
    const w = world();
    const d = suggestDeal(w, "IND")!;
    expect(d.good).toBe("energy");
    expect(w.countries[d.to].goods.energy.prod).toBeGreaterThan(w.countries[d.to].goods.energy.demand);
  });

  it("counts contracted units after a treaty", () => {
    const w = world();
    const d = suggestDeal(w, "IND")!;
    const p: Proposal = { id: "x", turn: 1, from: "IND", to: d.to, gives: d.gives, wants: d.wants, turns: 3, status: "accepted" };
    const next = resolveTurn(w, { IND: { proposalsSent: 1 } }, [p]);
    expect(contracted(next, "IND", "energy")).toBeGreaterThan(0);
  });
});
