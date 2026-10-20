import { describe, expect, it } from "vitest";
import { NEXT, NOW, THEN } from "./bank";
import { BLANK, cleanTitle, mask, newsQuestions } from "./news";
import { buildRun, dailySeed, PER_ERA, points, RUN_LENGTH, shareText } from "./run";
import type { QuizCountry, QuizNews } from "./types";

const C = (iso3: string, name: string, lat: number, lng: number, area = 50): QuizCountry => ({ iso3, name, centroid: [lat, lng], area });
const COUNTRIES = [
  C("IRN", "Iran", 32, 53),
  C("IRQ", "Iraq", 33, 43),
  C("SAU", "Saudi Arabia", 24, 45),
  C("AFG", "Afghanistan", 34, 66),
  C("PAK", "Pakistan", 30, 70),
  C("TKM", "Turkmenistan", 39, 59),
  C("USA", "United States of America", 39, -98),
  C("CAN", "Canada", 60, -100),
  C("MEX", "Mexico", 23, -102),
  C("CUB", "Cuba", 21.5, -79),
  C("GTM", "Guatemala", 15.5, -90),
  C("RUS", "Russia", 60, 90),
  C("ISR", "Israel", 31, 35),
  C("JOR", "Jordan", 31, 36.5),
  C("LBN", "Lebanon", 33.9, 35.8),
  C("EGY", "Egypt", 26, 30),
  C("SYR", "Syria", 35, 38),
];
const byIso = new Map(COUNTRIES.map((c) => [c.iso3, c]));
const item = (id: string, title: string, countries: string[], verified = true): QuizNews => ({
  id,
  title,
  url: "https://example.com/a",
  source: "Reuters",
  publishedAt: "2026-10-07T10:00:00Z",
  sections: ["diplomacy"],
  countries,
  lat: null,
  lng: null,
  sourceCount: 3,
  verified,
});

describe("then · now · next", () => {
  it("every bank question has three distinct wrong answers and a fact", () => {
    for (const q of [...THEN, ...NOW, ...NEXT]) {
      expect(new Set([q.right, ...q.wrong]).size).toBe(4);
      expect(q.fact.length).toBeGreaterThan(20);
    }
    expect(new Set([...THEN, ...NOW, ...NEXT].map((q) => q.id)).size).toBe(THEN.length + NOW.length + NEXT.length);
  });

  it("blanks out the country, its people and its capital", () => {
    expect(mask("Iranian officials in Tehran reject Iran's offer", ["IRN"], byIso)).toBe(`${BLANK} officials in ${BLANK} reject ${BLANK} offer`);
    expect(mask("Trump says US will act", ["USA"], byIso)).toBe(`${BLANK} says ${BLANK} will act`);
    expect(mask("Iraq votes", ["IRN"], byIso)).toBe("Iraq votes");
  });

  it("fixes broken quote characters", () => {
    expect(cleanTitle("Israel�s  deadline")).toBe("Israel's deadline");
  });

  it("builds news questions with the answer among neighbours, skipping grim headlines", () => {
    const r = () => 0.3;
    const qs = newsQuestions(
      [item("1", "Iran says it will reopen talks on its nuclear programme", ["IRN"]), item("2", "Missile strike kills 19 in a block of flats in Israel", ["ISR"]), item("3", "Iran budget plan sent to parliament this week", ["IRN"])],
      COUNTRIES,
      3,
      r,
    );
    expect(qs).toHaveLength(1);
    const q = qs[0];
    expect(q.options[q.answer]).toBe("Iran");
    expect(q.quote).toContain(BLANK);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
  });

  it("a run has ten questions in era order, the same for the same day", () => {
    const news = [item("1", "Iran says it will reopen talks on its nuclear programme", ["IRN"]), item("2", "Mexico and Canada sign a new trade agreement this week", ["MEX", "CAN"])];
    const a = buildRun(20261020, news, COUNTRIES);
    expect(a).toHaveLength(RUN_LENGTH);
    expect(a.map((q) => q.era)).toEqual([...Array(PER_ERA.then).fill("then"), ...Array(PER_ERA.now).fill("now"), ...Array(PER_ERA.next).fill("next")]);
    expect(JSON.stringify(buildRun(20261020, news, COUNTRIES))).toBe(JSON.stringify(a));
    for (const q of a) expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(buildRun(20261020, [], [])).toHaveLength(RUN_LENGTH);
  });

  it("scores speed and streaks", () => {
    expect(points(false, 1000, 4)).toBe(0);
    expect(points(true, 0, 0)).toBe(150);
    expect(points(true, 20_000, 0)).toBe(100);
    expect(points(true, 20_000, 2)).toBe(150);
    expect(points(true, 20_000, 4)).toBe(200);
    expect(dailySeed(new Date(2026, 9, 20))).toBe(20261020);
  });

  it("shares without spoilers", () => {
    const run = buildRun(1, [], []);
    const text = shareText(
      "20 Oct",
      run,
      run.map((_, k) => ({
        picked: 0,
        correct: k % 2 === 0,
        ms: 1,
        points: 100,
      })),
      900,
    );
    expect(text).toContain("5/10");
    for (const q of run) if (q.options[q.answer].length > 4) expect(text).not.toContain(q.options[q.answer]);
  });
});
