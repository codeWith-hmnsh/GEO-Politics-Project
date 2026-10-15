import type { Iso3 } from "@/lib/game/engine/types";

/** How each of the six seats plays: shown on the Play page and the country pick. */
export const DIFF: Record<Iso3, "Medium" | "Hard"> = { IND: "Medium", CHN: "Medium", USA: "Medium", RUS: "Hard", SAU: "Medium", JPN: "Hard" };
export const PITCH: Record<Iso3, string> = {
  IND: "A young giant that runs on imported oil.",
  CHN: "The world's factory, hungry for energy.",
  USA: "Top of the table, with debt to manage.",
  RUS: "An energy superpower under sanctions.",
  SAU: "Oil wealth racing to build what comes next.",
  JPN: "Rich and inventive, short of energy.",
};
export const STRONG: Record<Iso3, string[]> = {
  IND: ["Growth", "Young workforce", "Food"],
  CHN: ["Industry", "Tech", "Reserves"],
  USA: ["Tech", "Energy", "Money"],
  RUS: ["Energy", "Food", "Military"],
  SAU: ["Oil", "Cash reserves"],
  JPN: ["Tech", "Money", "Skills"],
};
export const WEAK: Record<Iso3, string[]> = {
  IND: ["Oil imports", "Jobs"],
  CHN: ["Energy imports", "Ageing"],
  USA: ["Debt", "Stability"],
  RUS: ["Sanctions", "Tech imports"],
  SAU: ["Food", "Jobs beyond oil"],
  JPN: ["Energy imports", "Ageing", "Debt"],
};
