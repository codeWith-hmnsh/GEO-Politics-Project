// Projects = strategic capabilities (docs4.0/GAME-DESIGN.md §6). No workers, no levels, no grind.
import type { Ctx } from "./ctx";
import type { CountryState, Iso3, WorldState } from "./types";

export interface ProjectDef {
  id: string;
  name: string;
  costPct: number; // % of GDP in total, paid in equal parts per turn
  turns: number;
  capability: string; // shown on the tile
  legal?: (w: WorldState, me: Iso3) => true | string;
  complete: (ctx: Ctx, me: Iso3, parent: string) => void;
}

const bump = (ctx: Ctx, me: Iso3, field: keyof CountryState, by: number, label: string, parent: string) => {
  const c = ctx.w.countries[me];
  (c as unknown as Record<string, number>)[field] = Math.min(100, ((c as unknown as Record<string, number>)[field] ?? 0) + by);
  ctx.causes.add(me, field, by, label, { actor: me, parent });
};

export const PROJECTS: ProjectDef[] = [
  {
    id: "oilReserve",
    name: "Strategic Oil Reserve",
    costPct: 0.2,
    turns: 1,
    capability: "Energy reserve +2 turns of shortfall",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.energy;
      const add = Math.max(2, g.demand * 0.2);
      g.reserve += add;
      ctx.causes.add(me, "energy.reserve", add, "project.oilReserve", { actor: me, parent });
    },
  },
  {
    id: "refinery",
    name: "Refinery Expansion",
    costPct: 0.4,
    turns: 2,
    capability: "Energy production +5%",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.energy;
      const add = Math.max(g.prod * 0.05, g.demand * 0.025);
      g.prod += add;
      ctx.causes.add(me, "energy.prod", add, "project.refinery", { actor: me, parent });
    },
  },
  {
    id: "solar",
    name: "Solar & Wind Programme",
    costPct: 0.6,
    turns: 2,
    capability: "Energy production +4%, demand −2%",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.energy;
      const add = Math.max(g.prod * 0.04, g.demand * 0.02);
      g.prod += add;
      g.demand *= 0.98;
      ctx.causes.add(me, "energy.prod", add, "project.solar", { actor: me, parent });
    },
  },
  {
    id: "nuclear",
    name: "Nuclear Power Plant",
    costPct: 1.2,
    turns: 4,
    capability: "Energy production +10%",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.energy;
      const add = Math.max(g.prod * 0.1, g.demand * 0.06);
      g.prod += add;
      ctx.causes.add(me, "energy.prod", add, "project.nuclear", { actor: me, parent });
    },
  },
  {
    id: "pipeline",
    name: "Gas Pipeline",
    costPct: 0.5,
    turns: 3,
    capability: "Trade capacity +5 units",
    legal: (w, me) => (w.treaties.some((t) => t.a === me || t.b === me) ? true : "Needs a treaty partner"),
    complete: (ctx, me, parent) => bump(ctx, me, "tradeCapacity", 5, "project.pipeline", parent),
  },
  {
    id: "port",
    name: "Port & Shipping Hub",
    costPct: 0.5,
    turns: 2,
    capability: "Trade capacity +20%",
    complete: (ctx, me, parent) => {
      const c = ctx.w.countries[me];
      const add = c.tradeCapacity * 0.2;
      c.tradeCapacity += add;
      ctx.causes.add(me, "tradeCapacity", add, "project.port", { actor: me, parent });
    },
  },
  {
    id: "corridor",
    name: "Highways & Rail Corridor",
    costPct: 0.8,
    turns: 3,
    capability: "Infrastructure +10",
    complete: (ctx, me, parent) => bump(ctx, me, "infrastructure", 10, "project.corridor", parent),
  },
  {
    id: "irrigation",
    name: "Irrigation & Grain Storage",
    costPct: 0.3,
    turns: 2,
    capability: "Food production +6%, reserve +2",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.food;
      const add = g.prod * 0.06;
      g.prod += add;
      g.reserve += 2;
      ctx.causes.add(me, "food.prod", add, "project.irrigation", { actor: me, parent });
    },
  },
  {
    id: "fab",
    name: "Semiconductor Fab",
    costPct: 1.0,
    turns: 4,
    capability: "Tech production +12%",
    complete: (ctx, me, parent) => {
      const g = ctx.w.countries[me].goods.tech;
      const add = Math.max(g.prod * 0.12, g.demand * 0.06);
      g.prod += add;
      ctx.causes.add(me, "tech.prod", add, "project.fab", { actor: me, parent });
    },
  },
  {
    id: "industrialCorridor",
    name: "Industrial Corridor",
    costPct: 0.6,
    turns: 3,
    capability: "Industry +8, jobs",
    complete: (ctx, me, parent) => {
      bump(ctx, me, "industry", 8, "project.industrialCorridor", parent);
      ctx.mod(me, "unemployment", -0.6, "project.industrialCorridor", { actor: me, parent });
    },
  },
  {
    id: "universities",
    name: "National Universities",
    costPct: 0.5,
    turns: 3,
    capability: "Skills +8",
    complete: (ctx, me, parent) => bump(ctx, me, "skills", 8, "project.universities", parent),
  },
  {
    id: "hospitals",
    name: "Hospitals Programme",
    costPct: 0.4,
    turns: 2,
    capability: "Health +8, stability +3",
    complete: (ctx, me, parent) => {
      bump(ctx, me, "health", 8, "project.hospitals", parent);
      ctx.mod(me, "stability", 3, "project.hospitals", { actor: me, parent });
    },
  },
  {
    id: "financialCentre",
    name: "Financial Centre",
    costPct: 0.3,
    turns: 2,
    capability: "Borrowing cost −1 point",
    complete: (ctx, me, parent) => {
      ctx.w.countries[me].flags.push("financialCentre");
      ctx.causes.add(me, "interest", -1, "project.financialCentre", { actor: me, parent });
    },
  },
  {
    id: "apprenticeships",
    name: "Skills & Apprenticeships",
    costPct: 0.2,
    turns: 1,
    capability: "Unemployment −0.4, skills +3",
    complete: (ctx, me, parent) => {
      bump(ctx, me, "skills", 3, "project.apprenticeships", parent);
      ctx.mod(me, "unemployment", -0.4, "project.apprenticeships", { actor: me, parent });
    },
  },
  {
    id: "navalBase",
    name: "Naval Base",
    costPct: 0.4,
    turns: 2,
    capability: "Military +5, protects own shipping",
    complete: (ctx, me, parent) => {
      bump(ctx, me, "military", 5, "project.navalBase", parent);
      ctx.w.countries[me].flags.push("navalBase");
    },
  },
  {
    id: "airDefence",
    name: "Air Defence Network",
    costPct: 0.5,
    turns: 2,
    capability: "Military +6",
    complete: (ctx, me, parent) => bump(ctx, me, "military", 6, "project.airDefence", parent),
  },
];

export const PROJECT_BY_ID = new Map(PROJECTS.map((p) => [p.id, p]));

export function projectCost(c: CountryState, id: string): number {
  const p = PROJECT_BY_ID.get(id);
  return p ? (c.gdp * p.costPct) / 100 : 0;
}

export function projectLegal(w: WorldState, me: Iso3, id: string): true | string {
  const p = PROJECT_BY_ID.get(id);
  if (!p) return "Unknown project";
  const c = w.countries[me];
  if (c.completed.includes(id)) return "Already built";
  if (c.projects.some((a) => a.id === id)) return "Already building";
  if (c.projects.length >= c.slots) return "No free slot";
  if (c.treasury < projectCost(c, id) / p.turns) return "Not enough money for the first instalment";
  return p.legal ? p.legal(w, me) : true;
}
