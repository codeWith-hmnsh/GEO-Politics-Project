// Every tunable number lives here (docs4.0/GAME-DESIGN.md header). Bot self-play tunes these values.
import type { Dimension, Good, Ministry, Rating } from "./types";

export const ENGINE_VERSION = "4.0.0";

export const TURNS = 12;
export const START_YEAR = 2026;
export const TURN_SECONDS = (turn: number) => (turn === 1 ? 120 : turn === 2 ? 105 : 90);

export const PC_PER_TURN = 3;
export const PC_CARRY_MAX = 1;
export const PC_CAP = 4;
export const PROPOSAL_PC = 1;

export const TAX_MIN = 10;
export const TAX_MAX = 35;

export const INTEREST: Record<Rating, number> = { AAA: 2, AA: 2.5, A: 3, BBB: 4.5, BB: 6.5, B: 9, CCC: 14 };

/** Ministry index speed toward its target (SYSTEMS §3). */
export const MINISTRY_SPEED: Record<Ministry, number> = {
  welfare: 0.3,
  defence: 0.2,
  industry: 0.2,
  agriculture: 0.2,
  energy: 0.15,
  infrastructure: 0.15,
  education: 0.1,
};

/** $B of yearly trade value per unit at price 100. */
export const UNIT_VALUE: Record<Good, number> = { energy: 12, food: 8, tech: 20 };
export const PRICE_ELASTICITY: Record<Good, number> = { energy: 2.5, food: 2.0, tech: 1.5 };

/** Growth penalty per unit of shortage fraction (SYSTEMS §4). */
export const SHORTAGE_GROWTH: Record<Good, number> = { energy: 8, food: 4, tech: 5 };

export const OKUN = 0.3;
export const STABILITY_SPEED = 0.35;
export const UNREST_BELOW = 30;
export const CRISIS_BELOW = 15;

export const TENSION = { decay: 3, sanction: 4, tariff: 2, pressure: 5, embargo: 3, treaty: -2, panicAt: 70 };

export const RELATIONS = { drift: 0.95, perTreaty: 2, aid: 10, signed: 8, tariff: -10, sanction: -15, sanctionPerTurn: -3, pressure: -12, broken: -30 };
export const TRUST = { kept: 5, brokenPartner: -30, brokenOthers: -8 };

export const REGION = { fade: 0.97, perUnit: 0.2, perAidPct: 60, vote: 5, sanction: -6, leadMin: 25, influencePerTurn: 2, discountPer: 2, discountCap: 8 };

export const VOTE_TURNS = [3, 6, 9];
export const EVENT_TURNS = [2, 4, 6, 8, 10];
export const VOTE_PASS = 4;

export const POWER_WEIGHTS: Record<Dimension, number> = {
  economy: 0.25,
  development: 0.2,
  security: 0.2,
  diplomacy: 0.2,
  stability: 0.15,
};

export const SCORE = { base: 500, improvementMult: 6, improvementCap: 300, rankUp: 40, rankDown: -20, missionMax: 120, objectiveMax: 30 };

export const TREND_THRESHOLD = 2;

/** Balance handicap on improvement, tuned by bot self-play so every seat can win (GAME-DESIGN §16). */
export const HANDICAP: Record<"CHN" | "IND" | "JPN" | "RUS" | "SAU" | "USA", number> = { CHN: 1, IND: 0.6, JPN: 1, RUS: 1, SAU: 1, USA: 1 };

/** Difficulty adjustment in Leader Score points: harder seats get more, easier seats less (shown in the score breakdown). */
export const DIFFICULTY_BONUS: Record<"CHN" | "IND" | "JPN" | "RUS" | "SAU" | "USA", number> = { CHN: 0, IND: -8, JPN: 72, RUS: 78, SAU: 68, USA: 66 };

/** Project slots: 1 at start, 2 at GDP +10%, 3 at GDP +25%. */
export const SLOT_STEPS = [0.1, 0.25];
