import { describe, expect, it } from "vitest";
import { TOURS, matchesTour, stopSeconds } from "./tours";

describe("tours", () => {
  it("follow the content rules: 4–7 stops, captions of at most 25 words, 60–120 s", () => {
    expect(TOURS).toHaveLength(6);
    for (const t of TOURS) {
      expect(t.stops.length).toBeGreaterThanOrEqual(4);
      expect(t.stops.length).toBeLessThanOrEqual(7);
      for (const s of t.stops) expect(s.caption.split(/\s+/).length).toBeLessThanOrEqual(25);
      const total = t.stops.reduce((a, s) => a + stopSeconds(s.caption), 0) + 12;
      expect(total).toBeGreaterThanOrEqual(60);
      expect(total).toBeLessThanOrEqual(120);
    }
  });

  it("keeps each stop between 8 and 15 seconds", () => {
    expect(stopSeconds("Short.")).toBe(8);
    expect(stopSeconds(Array(60).fill("word").join(" "))).toBe(15);
  });

  it("matches live headlines on word starts", () => {
    const items = [{ title: "Houthis attack ship" }, { title: "Gazans flee" }, { title: "Magazine sales up" }];
    expect(matchesTour(items, ["Gaza", "Houthi"]).map((i) => i.title)).toEqual(["Houthis attack ship", "Gazans flee"]);
  });
});
