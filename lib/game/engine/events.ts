// Scenarios, world events and crisis cards (docs4.0/GAME-DESIGN.md §10).
import type { Ctx } from "./ctx";
import { shuffle, stream } from "./rng";
import type { Good, Iso3, ScenarioId, WorldState } from "./types";
import { SEATS } from "./types";
import { clamp, isExporter } from "./util";

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  brief: string;
  /** One-off changes to the start state. */
  setup: (w: WorldState) => void;
  /** Event deck weights by event group. */
  weights: Record<"energy" | "food" | "trade" | "general", number>;
  objectives: ObjectiveDef[];
}

export interface ObjectiveDef {
  id: string;
  text: string;
  /** Checked at the end of the match. */
  met: (w: WorldState, me: Iso3) => boolean;
}

const supplied = (w: WorldState, me: Iso3, g: Good) => w.countries[me].goods[g].supplyRatio;

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  energyShock: {
    id: "energyShock",
    name: "Energy Shock",
    brief: "Oil supply is tight. The world oil price is up 18%. Several countries are looking for new suppliers.",
    setup: (w) => {
      w.price.energy = 118;
      w.market.energy.shock = -0.06;
      w.tension += 8;
    },
    weights: { energy: 5, food: 1, trade: 1, general: 2 },
    objectives: [
      { id: "energySecure", text: "Energy supply at 100% at the end", met: (w, me) => supplied(w, me, "energy") >= 0.995 },
      { id: "lowInflation", text: "Inflation below 6% at the end", met: (w, me) => w.countries[me].inflation < 6 },
    ],
  },
  foodCrisis: {
    id: "foodCrisis",
    name: "Food Crisis",
    brief: "Harvests failed in two grain belts. Food prices are up 15% and governments are worried about bread prices.",
    setup: (w) => {
      w.price.food = 115;
      w.market.food.shock = -0.05;
      w.tension += 4;
    },
    weights: { energy: 1, food: 5, trade: 1, general: 2 },
    objectives: [
      { id: "foodSecure", text: "Food supply at 100% at the end", met: (w, me) => supplied(w, me, "food") >= 0.995 },
      { id: "stable", text: "Stability 55+ at the end", met: (w, me) => w.countries[me].stability >= 55 },
    ],
  },
  tradeWar: {
    id: "tradeWar",
    name: "Trade War",
    brief: "The USA and China are locked in a tariff fight. Supply chains are moving and every capital must choose.",
    setup: (w) => {
      w.pairs.USA.CHN.tariff = 25;
      w.pairs.CHN.USA.tariff = 10;
      relBothRaw(w, "USA", "CHN", -15);
      w.tension += 10;
    },
    weights: { energy: 1, food: 1, trade: 5, general: 2 },
    objectives: [
      { id: "growthAbove", text: "Growth above your start at the end", met: (w, me) => w.countries[me].growth >= w.countries[me].growth0 },
      { id: "techSecure", text: "Tech supply 95%+ at the end", met: (w, me) => w.countries[me].goods.tech.supplyRatio >= 0.95 },
    ],
  },
  calmStart: {
    id: "calmStart",
    name: "Calm Start",
    brief: "A quiet year. Prices are normal. The world is waiting to see who moves first.",
    setup: () => {},
    weights: { energy: 2, food: 2, trade: 2, general: 2 },
    objectives: [
      { id: "leadRegion", text: "Lead at least one partner region at the end", met: (w, me) => Object.values(w.regions).some((r) => r.leader === me) },
      { id: "threeTreaties", text: "Hold 2+ active treaties at the end", met: (w, me) => w.treaties.filter((t) => t.a === me || t.b === me).length >= 2 },
    ],
  },
};

function relBothRaw(w: WorldState, a: Iso3, b: Iso3, by: number) {
  w.pairs[a][b].relations = clamp(w.pairs[a][b].relations + by, -100, 100);
  w.pairs[b][a].relations = clamp(w.pairs[b][a].relations + by, -100, 100);
}


// ───────────────────────── Events ─────────────────────────

export interface EventDef {
  id: string; // `${group}.${name}`
  group: "energy" | "food" | "trade" | "general";
  title: string;
  place: string;
  apply: (ctx: Ctx, cause: string) => Iso3[]; // returns countries hit hard (they get the crisis card)
}

const hitIfImporter = (ctx: Ctx, g: Good) => SEATS.filter((s) => ctx.w.countries[s].goods[g].demand > ctx.w.countries[s].goods[g].prod * 1.1);

export const EVENTS: EventDef[] = [
  {
    id: "energy.hormuz",
    group: "energy",
    title: "Tanker attacked in the Strait of Hormuz",
    place: "Strait of Hormuz",
    apply: (ctx, cause) => {
      ctx.world.marketShock.energy -= 0.06;
      ctx.world.tensionAdd += 6;
      if (!ctx.w.countries.SAU.flags.includes("navalBase")) ctx.s.SAU.prodShock.energy *= 0.94;
      ctx.causes.add("SAU", "energy.prod", -ctx.w.countries.SAU.goods.energy.prod * 0.06, "event.hormuz", { actor: "event", parent: cause });
      return hitIfImporter(ctx, "energy");
    },
  },
  {
    id: "energy.pipeline",
    group: "energy",
    title: "Sabotage hits a major gas pipeline",
    place: "Baltic Sea",
    apply: (ctx) => {
      ctx.s.RUS.prodShock.energy *= 0.92;
      ctx.world.tensionAdd += 3;
      return ["RUS" as Iso3, ...hitIfImporter(ctx, "energy").filter((s) => s === "JPN" || s === "CHN")];
    },
  },
  {
    id: "energy.opecCut",
    group: "energy",
    title: "Oil producers announce a surprise output cut",
    place: "Vienna",
    apply: (ctx) => {
      ctx.world.marketShock.energy -= 0.05;
      return hitIfImporter(ctx, "energy");
    },
  },
  {
    id: "energy.mildWinter",
    group: "energy",
    title: "A mild winter cuts energy demand",
    place: "Northern Hemisphere",
    apply: (ctx) => {
      for (const s of SEATS) ctx.s[s].demandShock.energy *= 0.96;
      return SEATS.filter((s) => isExporter(ctx.w.countries[s], "energy"));
    },
  },
  {
    id: "food.monsoon",
    group: "food",
    title: "The monsoon fails across South Asia",
    place: "India",
    apply: (ctx, cause) => {
      ctx.s.IND.prodShock.food *= 0.88;
      ctx.mod("IND", "growth", -0.4, "event.monsoon", { actor: "event", parent: cause });
      return ["IND"];
    },
  },
  {
    id: "food.drought",
    group: "food",
    title: "Drought in China's grain belt",
    place: "Henan, China",
    apply: (ctx) => {
      ctx.s.CHN.prodShock.food *= 0.88;
      return ["CHN"];
    },
  },
  {
    id: "food.locusts",
    group: "food",
    title: "Locust swarms sweep across East Africa and Arabia",
    place: "Horn of Africa",
    apply: (ctx) => {
      ctx.world.marketShock.food -= 0.05;
      ctx.s.SAU.prodShock.food *= 0.8;
      return ["SAU" as Iso3, ...hitIfImporter(ctx, "food").filter((s) => s !== "SAU")].slice(0, 2);
    },
  },
  {
    id: "food.exportBans",
    group: "food",
    title: "A wave of food export bans hits world markets",
    place: "World",
    apply: (ctx) => {
      ctx.world.marketShock.food -= 0.07;
      return hitIfImporter(ctx, "food");
    },
  },
  {
    id: "trade.chipControls",
    group: "trade",
    title: "New chip export controls shake the tech trade",
    place: "Taiwan Strait",
    apply: (ctx) => {
      ctx.world.marketShock.tech -= 0.08;
      ctx.s.CHN.prodShock.tech *= 0.95;
      ctx.world.tensionAdd += 4;
      return ["CHN" as Iso3, ...hitIfImporter(ctx, "tech")].filter((s, i, a) => a.indexOf(s) === i).slice(0, 3);
    },
  },
  {
    id: "trade.portStrike",
    group: "trade",
    title: "Port strikes and canal delays choke shipping",
    place: "Suez Canal",
    apply: (ctx) => {
      for (const s of SEATS) ctx.s[s].tradeCapShock *= ctx.w.countries[s].flags.includes("navalBase") ? 0.95 : 0.85;
      return ["JPN", "IND"];
    },
  },
  {
    id: "trade.currencyShock",
    group: "trade",
    title: "A strong dollar sends emerging currencies tumbling",
    place: "New York",
    apply: (ctx, cause) => {
      for (const s of ["IND", "JPN", "RUS"] as Iso3[]) {
        ctx.mod(s, "inflation", 1.5, "event.currencyShock", { actor: "event", parent: cause });
        ctx.mod(s, "growth", -0.4, "event.currencyShock", { actor: "event", parent: cause });
      }
      return ["IND", "JPN"];
    },
  },
  {
    id: "trade.supplyShift",
    group: "trade",
    title: "Factories move out of China to new hubs",
    place: "Southeast Asia",
    apply: (ctx, cause) => {
      ctx.w.countries.CHN.industry = clamp(ctx.w.countries.CHN.industry - 2);
      ctx.causes.add("CHN", "industry", -2, "event.supplyShift", { actor: "event", parent: cause });
      for (const s of ["IND", "JPN"] as Iso3[]) {
        ctx.w.countries[s].industry = clamp(ctx.w.countries[s].industry + 2);
        ctx.causes.add(s, "industry", 2, "event.supplyShift", { actor: "event", parent: cause });
      }
      return ["CHN"];
    },
  },
  {
    id: "general.heatwave",
    group: "general",
    title: "Record heatwave strains power grids and crops",
    place: "World",
    apply: (ctx) => {
      for (const s of SEATS) {
        ctx.s[s].demandShock.energy *= 1.04;
        ctx.s[s].prodShock.food *= 0.97;
      }
      return hitIfImporter(ctx, "energy").slice(0, 2);
    },
  },
  {
    id: "general.financialPanic",
    group: "general",
    title: "Financial panic: markets fall worldwide",
    place: "World",
    apply: (ctx, cause) => {
      ctx.world.globalGrowthAdd -= 0.8;
      const hit = SEATS.filter((s) => (ctx.w.countries[s].debt / ctx.w.countries[s].gdp) * 100 > 100);
      for (const s of hit) ctx.mod(s, "stability", -2, "event.financialPanic", { actor: "event", parent: cause });
      return hit;
    },
  },
  {
    id: "general.pandemicScare",
    group: "general",
    title: "A new virus triggers a pandemic scare",
    place: "World",
    apply: (ctx, cause) => {
      for (const s of SEATS) {
        const c = ctx.w.countries[s];
        c.health = clamp(c.health - 3);
        ctx.causes.add(s, "health", -3, "event.pandemicScare", { actor: "event", parent: cause });
        ctx.mod(s, "growth", -0.5, "event.pandemicScare", { actor: "event", parent: cause });
      }
      return SEATS.filter((s) => ctx.w.countries[s].health < 60);
    },
  },
  {
    id: "general.techBreakthrough",
    group: "general",
    title: "A battery breakthrough lifts tech output",
    place: "World",
    apply: (ctx) => {
      for (const s of SEATS) if (ctx.w.countries[s].industry >= 55 || ctx.w.countries[s].completed.includes("fab")) ctx.s[s].prodShock.tech *= 1.05;
      return [];
    },
  },
];

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

/** A seeded deck of 5 events weighted by the scenario. */
export function buildEventDeck(seed: number, scenario: ScenarioId): string[] {
  const rand = stream(seed, 0, "events");
  const weights = SCENARIOS[scenario].weights;
  const pool = shuffle(EVENTS, rand);
  const deck: string[] = [];
  while (deck.length < 5) {
    const total = pool.reduce((t, e) => (deck.includes(e.id) ? t : t + weights[e.group]), 0);
    let r = rand() * total;
    for (const e of pool) {
      if (deck.includes(e.id)) continue;
      r -= weights[e.group];
      if (r <= 0) {
        deck.push(e.id);
        break;
      }
    }
  }
  return deck;
}

// ───────────────────────── Crisis cards ─────────────────────────

export interface CrisisChoice {
  id: string;
  label: string;
  forecast: string;
  apply: (ctx: Ctx, me: Iso3, cause: string) => void;
}

export interface CrisisDef {
  id: string; // same as the event id
  title: string;
  body: string;
  advisors: { finance: string; foreign: string; people: string };
  choices: CrisisChoice[];
  defaultChoice: string;
}

const growthMod = (v: number, label: string) => (ctx: Ctx, me: Iso3, cause: string) => ctx.mod(me, "growth", v, label, { actor: me, parent: cause });
const stabMod = (v: number, label: string) => (ctx: Ctx, me: Iso3, cause: string) => ctx.mod(me, "stability", v, label, { actor: me, parent: cause });
const spend = (pct: number, label: string) => (ctx: Ctx, me: Iso3, cause: string) => {
  const c = ctx.w.countries[me];
  c.treasury -= (c.gdp * pct) / 100;
  ctx.causes.add(me, "treasury", -(c.gdp * pct) / 100, label, { actor: me, parent: cause });
};
const all =
  (...fs: ((ctx: Ctx, me: Iso3, cause: string) => void)[]) =>
  (ctx: Ctx, me: Iso3, cause: string) =>
    fs.forEach((f) => f(ctx, me, cause));
const reserve = (g: Good) => (ctx: Ctx, me: Iso3) => {
  ctx.s[me].releaseReserve[g] = true;
};
const efficiency = (g: Good, cut: number) => (ctx: Ctx, me: Iso3, cause: string) => {
  const gs = ctx.w.countries[me].goods[g];
  gs.demand *= 1 - cut;
  ctx.causes.add(me, `${g}.demand`, -gs.demand * cut, "crisis.saving", { actor: me, parent: cause });
};
const wait = (label: string, v = -2) => stabMod(v, label);

const energyCrisis = (id: string, title: string, body: string): CrisisDef => ({
  id,
  title,
  body,
  advisors: {
    finance: "A subsidy protects prices but costs money we need.",
    foreign: "A supplier with spare oil would welcome a long contract.",
    people: "Fuel prices hit families and factories first.",
  },
  choices: [
    { id: "subsidy", label: "Subsidise fuel this year", forecast: "Stability +3 · treasury −0.3% GDP", apply: all(spend(0.3, "crisis.subsidy"), stabMod(3, "crisis.subsidy"), (ctx, me) => (ctx.s[me].fuelSubsidy = true)) },
    { id: "reserves", label: "Release strategic reserves", forecast: "Energy supply up this year", apply: reserve("energy") },
    { id: "save", label: "Ask people to save energy", forecast: "Energy demand −2% · stability −1", apply: all(efficiency("energy", 0.02), stabMod(-1, "crisis.save")) },
  ],
  defaultChoice: "save",
});

const foodCrisis = (id: string, title: string, body: string): CrisisDef => ({
  id,
  title,
  body,
  advisors: {
    finance: "Imports cost money; reserves are already paid for.",
    foreign: "Neighbours will remember if we hoard food.",
    people: "Bread and rice prices decide the mood in the streets.",
  },
  choices: [
    { id: "reserves", label: "Release grain reserves", forecast: "Food supply up this year · stability +1", apply: all(reserve("food"), stabMod(1, "crisis.reserves")) },
    {
      id: "imports",
      label: "Emergency imports at any price",
      forecast: "Food supply first in line · treasury −0.2% GDP",
      apply: all(spend(0.2, "crisis.imports"), (ctx, me, cause) => {
        const g = ctx.start.countries[me].goods.food;
        ctx.s[me].priority.push({ buyer: me, seller: "market", good: "food", units: Math.max(1, g.demand * 0.1), premium: 1.1, causeId: cause });
      }),
    },
    { id: "rationing", label: "Price controls and rationing", forecast: "Inflation −0.5 · stability −3 · growth −0.2", apply: all((ctx, me, c) => ctx.mod(me, "inflation", -0.5, "crisis.rationing", { actor: me, parent: c }), stabMod(-3, "crisis.rationing"), growthMod(-0.2, "crisis.rationing")) },
  ],
  defaultChoice: "rationing",
});

const genericCrisis = (id: string, title: string, body: string, good: string): CrisisDef => ({
  id,
  title,
  body,
  advisors: {
    finance: "We can spend our way through this, but debt remembers.",
    foreign: `Partners with spare ${good} could help — for a price.`,
    people: "People want to see the government act.",
  },
  choices: [
    { id: "spend", label: "Emergency support package", forecast: "Growth +0.4 · stability +2 · treasury −0.5% GDP", apply: all(spend(0.5, "crisis.support"), growthMod(0.4, "crisis.support"), stabMod(2, "crisis.support")) },
    { id: "reform", label: "Use the crisis to push reforms", forecast: "Industry +2 · stability −2", apply: all((ctx, me, c) => {
      const s = ctx.w.countries[me];
      s.industry = clamp(s.industry + 2);
      ctx.causes.add(me, "industry", 2, "crisis.reform", { actor: me, parent: c });
    }, stabMod(-2, "crisis.reform")) },
    { id: "wait", label: "Wait and see", forecast: "Stability −2", apply: wait("crisis.wait") },
  ],
  defaultChoice: "wait",
});

export const CRISES: CrisisDef[] = [
  energyCrisis("energy.hormuz", "Shipping in Hormuz is under attack", "Tankers are rerouting. Our energy imports are delayed and prices are climbing."),
  energyCrisis("energy.pipeline", "A pipeline is down", "Gas flows have stopped. Industry wants answers today."),
  energyCrisis("energy.opecCut", "Producers cut oil output", "The world oil price jumps. Our import bill is rising."),
  {
    id: "energy.mildWinter",
    title: "A mild winter cuts demand for our oil",
    body: "Buyers want less. Prices soften and our export revenue is at risk.",
    advisors: { finance: "Lower prices mean a smaller budget.", foreign: "Long-term buyers would lock in volume now.", people: "Jobs in the oil fields depend on sales." },
    choices: [
      { id: "cut", label: "Cut output to hold the price", forecast: "Energy production −4% this year", apply: (ctx, me) => (ctx.s[me].prodShock.energy *= 0.96) },
      { id: "volume", label: "Keep pumping for market share", forecast: "Influence +1 · price falls", apply: (ctx, me, c) => {
        ctx.w.countries[me].influence = clamp(ctx.w.countries[me].influence + 1);
        ctx.causes.add(me, "influence", 1, "crisis.volume", { actor: me, parent: c });
      } },
    ],
    defaultChoice: "volume",
  },
  foodCrisis("food.monsoon", "The monsoon failed", "Rice and wheat harvests are down. Food prices are climbing in every market."),
  foodCrisis("food.drought", "Drought in the grain belt", "The harvest is down by a tenth. Cities are watching bread prices."),
  foodCrisis("food.locusts", "Locusts destroyed crops", "Farmers lost a season. Imports must fill the gap."),
  foodCrisis("food.exportBans", "Food exporters close their borders", "Our usual suppliers stopped selling. The market is short."),
  genericCrisis("trade.chipControls", "Chip controls cut our supply", "Factories are short of chips. Electronics and car plants slow down.", "tech"),
  genericCrisis("trade.portStrike", "Ports are jammed", "Shipping delays hit exporters and raise import costs.", "shipping"),
  genericCrisis("trade.currencyShock", "Our currency is falling", "Imports cost more. Investors are nervous.", "capital"),
  genericCrisis("trade.supplyShift", "Factories are leaving", "Companies move production abroad. Jobs are at risk.", "investment"),
  energyCrisis("general.heatwave", "Heatwave strains the grid", "Power demand is at a record. Blackouts are possible."),
  genericCrisis("general.financialPanic", "Markets are in panic", "Bond yields jump. Our borrowing costs rise.", "credit"),
  {
    id: "general.pandemicScare",
    title: "A pandemic scare",
    body: "Hospitals are filling. People want protection, business wants to stay open.",
    advisors: { finance: "Closures cost growth.", foreign: "Shared vaccines would build trust abroad.", people: "Health comes first for most families." },
    choices: [
      { id: "health", label: "Fund hospitals and testing", forecast: "Health +4 · treasury −0.3% GDP", apply: all(spend(0.3, "crisis.health"), (ctx, me, c) => {
        const s = ctx.w.countries[me];
        s.health = clamp(s.health + 4);
        ctx.causes.add(me, "health", 4, "crisis.health", { actor: me, parent: c });
      }) },
      { id: "open", label: "Keep the economy open", forecast: "Growth +0.3 · stability −3", apply: all(growthMod(0.3, "crisis.open"), stabMod(-3, "crisis.open")) },
    ],
    defaultChoice: "open",
  },
  genericCrisis("general.techBreakthrough", "A tech race begins", "Rivals are racing to use the new batteries.", "tech"),
];

export const CRISIS_BY_ID = new Map(CRISES.map((c) => [c.id, c]));

/** Sanity: every event has a crisis card. */
export const EVENTS_WITHOUT_CRISIS = EVENTS.filter((e) => !CRISIS_BY_ID.has(e.id)).map((e) => e.id);

