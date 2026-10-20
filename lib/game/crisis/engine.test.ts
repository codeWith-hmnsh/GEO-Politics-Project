import { describe, expect, it } from "vitest";
import { SEATS } from "../engine/types";
import { CRISES } from "./deck";
import { agendaOffer, crisisOf, decideBot, newMatch, planBots, resolveYear, score, standings } from "./engine";
import { RESPONSE_BY_ID, RESPONSES } from "./responses";
import type { Choice, MatchState } from "./types";

function play(seed: number, pick: (m: MatchState) => Choice = () => "coop") {
  let m = newMatch(seed, "IND", agendaOffer(seed, "IND")[0]);
  while (!m.ended) {
    const { plan } = planBots(m);
    m = resolveYear(m, { choice: pick(m), policies: m.hands.IND.slice(0, 2) }, plan).next;
  }
  return m;
}

describe("crisis table engine", () => {
  it("every crisis is complete", () => {
    for (const c of CRISES) {
      expect(c.need).toBeGreaterThanOrEqual(3);
      for (const k of ["coop", "self", "hard", "wait"] as const) expect(c.choices[k].title.length).toBeGreaterThan(3);
      for (const s of Object.values(c.next ?? {})) expect(CRISES.some((x) => x.id === s)).toBe(true);
    }
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(play(7))).toBe(JSON.stringify(play(7)));
  });

  it("runs ten years without repeating a crisis", () => {
    const m = play(11);
    expect(m.history).toHaveLength(10);
    expect(new Set(m.history.map((h) => h.crisisId)).size).toBe(10);
    for (const s of SEATS) for (const v of Object.values(m.seats[s].meters)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("every crisis has four home responses, each explained, with one that protects", () => {
    for (const c of CRISES) {
      const list = RESPONSES[c.id];
      expect(list).toHaveLength(4);
      expect(list.some((x) => x.shield)).toBe(true);
      for (const x of list) expect(x.why.length).toBeGreaterThan(10);
    }
  });

  it("deals this crisis's own responses", () => {
    const m = newMatch(3, "JPN");
    expect(m.hands.JPN).toHaveLength(4);
    for (const id of m.hands.JPN) expect(id.startsWith(`${crisisOf(m).id}.`)).toBe(true);
    for (const id of m.hands.JPN) expect(RESPONSE_BY_ID.has(id)).toBe(true);
  });

  it("a broken pledge costs allies and trust", () => {
    const m = newMatch(5, "IND");
    const { plan } = planBots(m);
    const { record, next } = resolveYear(m, { choice: "self", pledge: "coop", policies: [] }, plan);
    expect(record.broke).toContain("IND");
    expect(record.reasons.IND.some((r) => r.text.startsWith("Broke your pledge"))).toBe(true);
    expect(next.trust.USA.IND).toBeLessThan(m.trust.USA.IND);
  });

  it("bots play a mix of answers and joint answers sometimes work", () => {
    const seen: Record<Choice, number> = { coop: 0, self: 0, hard: 0, wait: 0 };
    let wins = 0;
    let years = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const m = play(seed, (x) => decideBot(x, "IND", {}));
      for (const h of m.history) {
        years++;
        if (h.success) wins++;
        for (const s of SEATS) seen[h.picks[s]]++;
      }
    }
    const rate = wins / years;
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.8);
    for (const k of Object.keys(seen) as Choice[]) expect(seen[k]).toBeGreaterThan(years * 0.08);
    console.log("success rate", rate.toFixed(2), seen);
  });

  it("always cooperating with the top two cards does not win", () => {
    let rank = 0;
    let games = 0;
    for (let seed = 1; seed <= 20; seed++)
      for (const me of SEATS) {
        let m = newMatch(seed, me, agendaOffer(seed, me)[0]);
        while (!m.ended) {
          const { plan } = planBots(m);
          m = resolveYear(m, { choice: "coop", pledge: "coop", policies: m.hands[me].slice(0, 2) }, plan).next;
        }
        rank += standings(m).findIndex((x) => x.iso3 === me) + 1;
        games++;
      }
    expect(rank / games).toBeGreaterThan(2.8);
  });

  it("scores start at 500 and stay in range", () => {
    const m = newMatch(9, "USA");
    expect(score(m, "USA").total).toBeGreaterThanOrEqual(500);
    const end = play(9);
    for (const s of SEATS) {
      const t = score(end, s).total;
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1000);
    }
  });
});
