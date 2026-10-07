import { describe, expect, it } from "vitest";
import { capabilityScores } from "./capability";

describe("capabilityScores", () => {
  const rows = [
    { iso3: "AAA", aircraft: 3000, tanks: 2600, warships: 180, carriers: 11, budget: 900e9, personnel: 1.3e6 },
    { iso3: "BBB", aircraft: 100, tanks: 60, warships: 15, carriers: 0, budget: 30e9, personnel: 60e3 },
    { iso3: "CCC", aircraft: 0, tanks: 0, warships: 0, carriers: 0 },
  ];
  const s = capabilityScores(rows);

  it("gives the largest inventory a 10 in every domain", () => {
    expect(s.get("AAA")).toEqual({ air: 10, land: 10, sea: 10, overall: 10 });
  });

  it("keeps scores within 0–10 and orders them by size", () => {
    const b = s.get("BBB")!;
    for (const v of Object.values(b)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(10);
    }
    expect(s.get("CCC")).toEqual({ air: 0, land: 0, sea: 0, overall: 0 });
  });
});
