// Plain-language text for the game UI: names, numbers and the Why chain (UI-DESIGN §3 rule 7).
import { CARD_BY_ID } from "./engine/cards";
import { PROJECT_BY_ID } from "./engine/projects";
import type { Cause, Good, Iso3 } from "./engine/types";

export const NAMES: Record<Iso3, string> = { IND: "India", CHN: "China", USA: "United States", RUS: "Russia", SAU: "Saudi Arabia", JPN: "Japan" };
export const SHORT: Record<Iso3, string> = { IND: "India", CHN: "China", USA: "USA", RUS: "Russia", SAU: "Saudi Arabia", JPN: "Japan" };
export const SEAT_COLOR: Record<Iso3, string> = { IND: "#E57A3A", CHN: "#C2413B", USA: "#2B6A73", RUS: "#5E6B70", SAU: "#2FA36B", JPN: "#8B6B3E" };
export const LEADERS: Record<Iso3, string> = { IND: "Asha Rao", CHN: "Li Wen", USA: "Dana Brooks", RUS: "Pavel Orlov", SAU: "Faisal Al-Amin", JPN: "Hana Mori" };
/** Capitals, used for labels, arcs and camera moves. [lat, lng] */
export const CAPITAL: Record<Iso3, [number, number]> = { IND: [28.6, 77.2], CHN: [39.9, 116.4], USA: [38.9, -77.0], RUS: [55.75, 37.6], SAU: [24.7, 46.7], JPN: [35.7, 139.7] };
export const GOOD_WORD: Record<Good, string> = { energy: "oil and gas", food: "food", tech: "chips" };
export const GOOD_SHORT: Record<Good, string> = { energy: "Energy", food: "Food", tech: "Chips" };
export const GOOD_COLOR: Record<Good, string> = { energy: "#E8A21C", food: "#5E9E3A", tech: "#2B6A73" };

export const money = (b: number) => (Math.abs(b) >= 1000 ? `$${(b / 1000).toFixed(Math.abs(b) >= 10000 ? 1 : 2)}T` : `$${Math.round(b)}B`);
export const signed = (x: number, d = 1) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(d)}`;
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "4 units" means little to a player; show it as a share of their own needs. */
export function unitsAsShare(units: number, demand: number, good: Good) {
  const pct = demand > 0 ? Math.round((units / demand) * 100) : 0;
  return `${units} units (≈${pct}% of your ${GOOD_WORD[good]} needs)`;
}

export const cardName = (id: string) => CARD_BY_ID.get(id)?.name ?? PROJECT_BY_ID.get(id)?.name ?? id;

const MIN: Record<string, string> = { industry: "Industry & Jobs", infrastructure: "Infrastructure", agriculture: "Agriculture", energy: "Energy", education: "Education", welfare: "Health & Welfare", defence: "Defence" };

/** One cause record as a short sentence for the Why chain. */
export function causeText(c: Cause): string {
  const L = c.label;
  const field = c.field.split(".").slice(1).join(".");
  const who = c.actor && c.actor in SHORT ? SHORT[c.actor as Iso3] : "a partner";
  if (L === "treaty.flow") return `Supply pact with ${who}`;
  if (L === "treaty.supply") return `${who} delivered under your pact`;
  if (L === "sanctions.delay") return "Sanctions delayed part of the delivery";
  if (L === "market.buy") return "Bought on the world market";
  if (L === "reserve.draw") return "Drew on strategic reserves";
  if (L === "card.secureImports") return "Priority oil purchase";
  if (L.startsWith("goods.") && L.endsWith(".supply")) return `${cap(GOOD_WORD[field.split(".")[0] as Good] ?? field)} supply ${c.delta >= 0 ? "up" : "down"}`;
  if (L.startsWith("growth.short.")) return `${cap(GOOD_WORD[L.split(".")[2] as Good])} shortage ${c.delta < 0 ? "held back growth" : "eased"}`;
  if (L === "growth.potential") return "Skills, infrastructure and industry";
  if (L === "growth.fiscal") return "Budget stimulus";
  if (L === "growth.trade") return "World prices for what you buy and sell";
  if (L === "growth.investment") return "Foreign investment";
  if (L === "growth.sanctions") return "Sanctions on your economy";
  if (L === "growth.tension") return "Markets fear world tension";
  if (L === "growth.unrest") return "Unrest at home";
  if (L === "growth.world") return "The world economy";
  if (L === "macro.growth") return "Economic growth";
  if (L === "macro.okun") return "Growth vs. the jobs a growing workforce needs";
  if (L === "inflation.energy") return "Energy prices";
  if (L === "inflation.food") return "Food prices";
  if (L === "stability.jobs") return "Jobs";
  if (L === "stability.prices") return "Prices";
  if (L === "stability.shortages") return "Shortages";
  if (L === "budget.revenue") return "Tax revenue";
  if (L === "budget.ministries") return "Ministry spending";
  if (L === "budget.interest") return "Interest on debt";
  if (L === "budget.taxUp") return "Tax rise";
  if (L === "budget.highTax") return "High taxes";
  if (L.startsWith("budget.")) return `Budget: ${MIN[L.split(".")[1]] ?? L.split(".")[1]}`;
  if (L === "goods.exportRent") return "Export earnings to the treasury";
  if (L === "goods.tariffRevenue") return "Tariff revenue";
  if (L === "diplomacy.influence") return "Relations, treaties and regions";
  if (L === "treaty.signed") return "Treaty signed";
  if (L === "treaty.broken") return "Broken promise";
  if (L === "treaty.grantPaid" || L === "treaty.investmentSent") return "Money paid under a pact";
  if (L === "treaty.grantReceived") return "Money received under a pact";
  if (L === "treaty.investmentReceived") return "Investment received under a pact";
  if (L === "macro.borrow") return "Borrowing to cover the gap";
  if (L.startsWith("project.start.")) return `Instalment: ${cardName(L.slice(14))}`;
  if (L.startsWith("project.")) return `Completed: ${cardName(L.slice(8))}`;
  if (L.startsWith("event.")) return "World event";
  if (L.startsWith("crisis.")) return "Your crisis decision";
  if (L.startsWith("card.cost.")) return `Cost: ${cardName(L.slice(10))}`;
  if (L.startsWith("card.")) {
    const id = [...CARD_BY_ID.keys()].find((k) => k.endsWith("." + L.split(".")[1]));
    return id ? cardName(id) : cap(L.slice(5));
  }
  if (CARD_BY_ID.has(L)) return cardName(L);
  return L;
}

/** A short value for a cause, in the unit of its field. */
export function causeValue(c: Cause): string {
  const f = c.field.split(".").slice(1).join(".");
  if (["move", "treaty", "project", "crisis", "event", "budget"].includes(f)) return "";
  if (f === "treasury" || f === "debt") return `${c.delta > 0 ? "+" : "−"}${money(Math.abs(c.delta))}`;
  if (f.endsWith("supply") || f.endsWith("supplyRatio")) return `${signed(c.delta, 1)} pts`;
  if (f === "growth" || f === "inflation" || f === "unemployment") return `${signed(c.delta, 2)} pts`;
  return signed(c.delta, 1);
}
