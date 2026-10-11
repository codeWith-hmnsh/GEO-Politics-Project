// Browser entry for the HTML prototypes (all_refrence-ui/prototype-statecraft-4). Bundled by scripts/build-proto-engine.mjs.
export { answerHumanProposal, closeTurn, planBots } from "./match";
export { createWorld } from "./engine/init";
export { forecast, resolveTurn } from "./engine/resolve";
export { CARDS, CARD_BY_ID, cardCost, cardLegal, suggestCards } from "./engine/cards";
export { PROJECTS, PROJECT_BY_ID, projectCost, projectLegal } from "./engine/projects";
export { CRISIS_BY_ID, EVENT_BY_ID, SCENARIOS } from "./engine/events";
export { REGION_DEFS } from "./engine/regions";
export { RESOLUTION_BY_ID } from "./engine/votes";
export { dimensions, leaderScore, MISSIONS, ranks, standings, trend } from "./engine/score";
export { whyChain } from "./engine/causes";
export { termText, proposalLegal, termsCost, termsValue } from "./engine/treaties";
export { selfSufficiency, rentShare, powerIndex } from "./engine/score";
export * as rules from "./engine/rules";
export { SEATS, GOODS, MINISTRIES, REGIONS, DIMENSIONS } from "./engine/types";
export { SEED_2026 } from "./seed";
