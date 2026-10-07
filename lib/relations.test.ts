import { describe, expect, it } from "vitest";
import { relationsFor } from "./relations";

const orgs = [
  { id: "NATO", members: ["USA", "FRA", "TUR"] },
  { id: "BRICS", members: ["IND", "CHN"] },
];
const curated = [
  { a: "USA", b: "TUR", status: "mixed", basis: "NATO ally with disputes" },
  { a: "IND", b: "CHN", status: "mixed", basis: "Trade partner; border dispute" },
  { a: "RUS", b: "FRA", status: "hostile", basis: "Sanctions" },
];

describe("relationsFor", () => {
  it("uses bloc rules, then curated rows override them", () => {
    const usa = relationsFor("USA", curated, orgs);
    expect(usa.get("FRA")?.status).toBe("ally");
    expect(usa.get("FRA")?.source).toBe("rule");
    expect(usa.get("TUR")?.status).toBe("mixed");
  });

  it("applies rows written from the other side", () => {
    expect(relationsFor("FRA", curated, orgs).get("RUS")?.status).toBe("hostile");
  });

  it("does not treat BRICS co-membership as an alliance", () => {
    expect(relationsFor("CHN", curated, orgs).get("IND")?.status).toBe("mixed");
    expect(relationsFor("BRA", curated, orgs).size).toBe(0);
  });
});
