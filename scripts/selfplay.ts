// Headless bot-only matches with a balance report (docs4.0/GAME-DESIGN.md §16).
// Run: npx tsx scripts/selfplay.ts [matches=500] [difficulty=normal]
import { createWorld } from "@/lib/game/engine/init";
import { leaderScore, standings } from "@/lib/game/engine/score";
import type { Iso3, ScenarioId } from "@/lib/game/engine/types";
import { SEATS } from "@/lib/game/engine/types";
import { playBotMatch } from "@/lib/game/match";
import { SEED_2026 } from "@/lib/game/seed";
import type { Difficulty } from "@/lib/game/bots/decide";

const N = Number(process.argv[2] ?? 500);
const difficulty = (process.argv[3] ?? "normal") as Difficulty;
const scenarios: ScenarioId[] = ["energyShock", "foodCrisis", "tradeWar", "calmStart"];

const wins: Record<string, number> = {};
const score: Record<string, number[]> = {};
const stat = (k: string) => (stats[k] ??= []);
const stats: Record<string, number[]> = {};
const cardUse: Record<string, number> = {};
const cardWin: Record<string, number> = {};
let errors = 0;
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  const scenario = scenarios[i % scenarios.length];
  try {
    const w = playBotMatch(createWorld(SEED_2026, { matchId: `sp${i}`, seed: 1000 + i, scenario }), difficulty);
    const st = standings(w);
    const winner = st[0].iso3;
    wins[winner] = (wins[winner] ?? 0) + 1;
    for (const s of SEATS) {
      const ls = leaderScore(w, s);
      (score[s] ??= []).push(ls.total);
      stat(`${s}.mission`).push(ls.mission);
      stat(`${s}.improvement`).push(ls.improvement);
      stat(`${s}.rankClimb`).push(ls.rankClimb);
      const c = w.countries[s];
      stat(`${s}.debt%`).push((c.debt / c.gdp) * 100);
      stat(`${s}.stability`).push(c.stability);
      stat(`${s}.growth`).push(c.growth);
      stat(`${s}.unemp`).push(c.unemployment);
    }
    stat("treaties").push(w.history.reduce((t, h) => t + h.news.filter((n) => n.headline.includes("sign a")).length, 0));
    stat("price.energy").push(w.price.energy);
    stat("price.food").push(w.price.food);
    stat("price.tech").push(w.price.tech);
    stat("tension").push(w.tension);
    for (const h of w.history) {
      for (const c of h.causes.filter((x) => x.field.endsWith(".move"))) {
        cardUse[c.label] = (cardUse[c.label] ?? 0) + 1;
        if (c.actor === winner) cardWin[c.label] = (cardWin[c.label] ?? 0) + 1;
      }
    }
  } catch (e) {
    errors++;
    if (errors < 3) console.error(e);
  }
}

const avg = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
const pct = (x: number) => `${((x / N) * 100).toFixed(1)}%`;
console.log(`\n${N} matches, ${difficulty}, ${((Date.now() - t0) / 1000).toFixed(1)} s, errors ${errors}\n`);
console.log("Win rate (target 12–22% each):");
for (const s of SEATS) console.log(`  ${s}  ${pct(wins[s] ?? 0).padStart(6)}   avg score ${avg(score[s] ?? []).toFixed(0)}`);
console.log("\nEnd-of-match averages:");
for (const s of SEATS as readonly Iso3[])
  console.log(`  ${s}  impr ${avg(stats[`${s}.improvement`]).toFixed(0)}  mission ${avg(stats[`${s}.mission`]).toFixed(0)}  rank ${avg(stats[`${s}.rankClimb`]).toFixed(0)}  growth ${avg(stats[`${s}.growth`]).toFixed(2)}  unemp ${avg(stats[`${s}.unemp`]).toFixed(2)}  debt ${avg(stats[`${s}.debt%`]).toFixed(0)}%  stability ${avg(stats[`${s}.stability`]).toFixed(1)}`);
console.log(`  prices energy ${avg(stats["price.energy"]).toFixed(1)} food ${avg(stats["price.food"]).toFixed(1)} tech ${avg(stats["price.tech"]).toFixed(1)}  tension ${avg(stats.tension).toFixed(1)}  treaties/match ${avg(stats.treaties).toFixed(1)}`);
console.log("\nCard share of winners' plays (flag > 60%):");
const winnerPlays = Object.values(cardWin).reduce((t, x) => t + x, 0) || 1;
for (const [k, v] of Object.entries(cardWin).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${k.padEnd(30)} ${((v / winnerPlays) * 100).toFixed(1)}%  (all plays ${cardUse[k]})`);
