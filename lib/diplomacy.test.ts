import { describe, expect, it } from "vitest";
import { alignment, issuerPoint, sanctionsFor } from "./diplomacy";

describe("diplomacy helpers", () => {
  it("lists sanctions received and imposed, including through the EU", () => {
    const rus = sanctionsFor("RUS", false);
    expect(rus.received.map((r) => r.target)).toEqual(["RUS"]);
    expect(rus.imposed).toEqual([]);
    const fra = sanctionsFor("FRA", true);
    expect(fra.imposed.some((r) => r.target === "RUS" && r.via === "EU")).toBe(true);
    const usa = sanctionsFor("USA", false);
    expect(usa.imposed.every((r) => r.via === null)).toBe(true);
  });

  it("starts UN and EU arcs at their seats, others at the country", () => {
    expect(issuerPoint("EU", () => undefined)).toEqual([50.85, 4.35]);
    expect(issuerPoint("USA", () => [39, -98])).toEqual([39, -98]);
  });

  it("ranks the most and least aligned voters", () => {
    const { most, least } = alignment({ A: 90, B: 40, C: 70, SELF: 100 }, "SELF", 2);
    expect(most).toEqual([["A", 90], ["C", 70]]);
    expect(least).toEqual([["B", 40], ["C", 70]]);
  });
});
