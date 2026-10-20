// What a country can do at home about this year's crisis. Every crisis deals its own four responses,
// and each one is a trade-off: protect against failure, invest for later, grab a quick win, bet on the
// joint answer, or hit back. The `why` line ties the card to the crisis in one sentence.
import type { ResponseDef, ResponseKind } from "./types";

type Row = [kind: ResponseKind, name: string, why: string, rest: Omit<ResponseDef, "id" | "kind" | "name" | "why">];

const ROWS: Record<string, Row[]> = {
  hormuz: [
    ["protect", "Fill the oil reserves", "Stored oil softens the blow if the strait stays shut.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Switch to solar and nuclear", "Less oil means the next blocked strait hurts less.", { effect: { economy: -2, people: 2, allies: 1 } }],
    ["quick", "Buy cheap Russian oil", "Cheap fuel now, but your partners notice.", { effect: { economy: 4, allies: -3 } }],
    ["bet", "Insure the tankers", "Pays off only if the strait reopens.", { effect: { economy: -1 }, ifWin: { economy: 4 } }],
  ],
  opec: [
    ["protect", "Cap fuel prices at home", "Keeps prices bearable if the cut lasts all year.", { effect: { economy: -2, people: 1 }, shield: true }],
    ["invest", "Electric buses and trains", "Every bus off diesel is oil you no longer import.", { effect: { economy: -1, people: 3 } }],
    ["quick", "Trade weapons for oil", "Producers sell cheaper oil in return for arms.", { effect: { economy: 4, allies: -3 } }],
    ["tough", "Sue the producers for price fixing", "Popular at home, and it angers the producers.", { effect: { people: 3, allies: -2 }, tension: 3 }],
  ],
  pipeline: [
    ["protect", "Fill gas storage", "Full tanks get you through winter if gas stays scarce.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Insulate homes", "Warmer homes need less gas this winter and every winter.", { effect: { economy: -1, people: 3 } }],
    ["quick", "Sign a 20-year gas contract", "Gas secured now, from one seller you now depend on.", { effect: { economy: 3, allies: -2 } }],
    ["tough", "Navy patrols on undersea cables", "Guards your pipes and cables; rivals call it a provocation.", { effect: { military: 3, allies: -2 }, tension: 3 }],
  ],
  monsoon: [
    ["protect", "Open the grain stores", "Stored grain keeps prices down if the harvest fails.", { effect: { economy: -1, people: 1 }, shield: true }],
    ["invest", "Water-saving farming", "Drip irrigation protects next year's harvest too.", { effect: { economy: -2, people: 3 } }],
    ["quick", "Barter for rice abroad", "Food arrives fast, but neighbours see you grabbing.", { effect: { people: 3, economy: -1, allies: -1 } }],
    ["bet", "Back the fertiliser fund", "Pays off only if the world food fund works.", { effect: { economy: -1 }, ifWin: { people: 4 } }],
  ],
  foodbans: [
    ["protect", "Fair ration cards", "Everyone stays fed if the bans spread.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Grow more at home", "Your own farms cannot be banned by anyone else.", { effect: { economy: -2, people: 3 } }],
    ["quick", "Lease farmland abroad", "Food for you; locals call it a land grab.", { effect: { people: 3, allies: -3 } }],
    ["bet", "Ship grain to the open-trade pact", "Pays off only if the pact holds.", { effect: { people: -1 }, ifWin: { economy: 3, allies: 1 } }],
  ],
  chips: [
    ["protect", "Strategic chip stockpile", "A stockpile absorbs the shortage if the tech world splits.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Build a chip factory at home", "Slow and costly, but nobody can cut you off again.", { effect: { economy: -2, military: 2, people: 2 } }],
    ["quick", "Exclusive deal with one supplier", "Chips now; dependence on one supplier later.", { effect: { economy: 4, allies: -2 } }],
    ["tough", "Tariffs on the country that banned", "Voters cheer, trade partners brace for a fight.", { effect: { people: 3, economy: -1, allies: -1 }, tension: 4 }],
  ],
  redsea: [
    ["protect", "Insure your cargo", "Covers your losses if ships keep getting hit.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Build rail links overland", "A land route that no missile can close.", { effect: { economy: -1, allies: 2, people: 1 } }],
    ["bet", "Book Suez slots early", "Pays off only if convoys reopen the route.", { effect: { economy: -1 }, ifWin: { economy: 4 } }],
    ["tough", "Send a warship alone", "Shows strength; others see a lone wolf.", { effect: { military: 3, economy: -1, allies: -1 }, tension: 4 }],
  ],
  dollar: [
    ["protect", "Build currency reserves", "Reserves defend your currency if markets panic.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Trade in your own currency", "Less need for dollars the next time they spike.", { effect: { economy: 2, allies: 1, people: -1 } }],
    ["quick", "Raise interest rates", "Stops money leaving, but loans cost families more.", { effect: { economy: 3, people: -2 } }],
    ["bet", "Buy foreign assets cheap", "Pays off only if the markets calm down.", { effect: { economy: -1 }, ifWin: { economy: 4 } }],
  ],
  debt: [
    ["protect", "Cut your lending risk", "Fewer bad loans on your books if defaults spread.", { effect: { allies: -1 }, shield: true }],
    ["invest", "Fund schools and roads abroad", "Builds friends who remember who helped.", { effect: { allies: 4, economy: -2 } }],
    ["quick", "Buy their ports and mines cheap", "Great prices now; resentment for years.", { effect: { economy: 4, allies: -3 } }],
    ["bet", "Join the creditors' club", "Pays off only if joint relief works.", { effect: { economy: -1 }, ifWin: { allies: 3, economy: 1 } }],
  ],
  pandemic: [
    ["protect", "Hospital surge plan", "Extra beds save lives if the virus spreads.", { effect: { economy: -1, people: 1 }, shield: true }],
    ["invest", "Build a vaccine factory", "You will never wait in line for doses again.", { effect: { economy: -2, people: 4 } }],
    ["quick", "Sell masks and tests abroad", "Big profits while others are desperate.", { effect: { economy: 4, allies: -2 } }],
    ["tough", "Ban travel from the source", "Feels safe at home and insults the country hit first.", { effect: { people: 3, economy: -1, allies: -2 }, tension: 3 }],
  ],
  heatwave: [
    ["protect", "Cooling centres and water", "Keeps people safe if the heat and blackouts last.", { effect: { economy: -1, people: 1 }, shield: true }],
    ["invest", "Fix the power grid", "A stronger grid survives the next heatwave.", { effect: { economy: -1, people: 3 } }],
    ["quick", "Burn more coal", "Keeps the lights on now; neighbours choke on the smoke.", { effect: { economy: 3, allies: -2 } }],
    ["bet", "Join a regional power grid", "Pays off only if the emergency plan works.", { effect: { economy: -1 }, ifWin: { people: 3, allies: 1 } }],
  ],
  cyber: [
    ["protect", "Offline backups for the grid", "The lights come back fast if the hackers strike you.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Train cyber experts", "A skilled team guards you for years.", { effect: { military: 2, people: 1, economy: -1 } }],
    ["quick", "Pay the ransom", "Systems back today; it invites the next attack.", { effect: { economy: 3, military: -2 } }],
    ["tough", "Name the hackers publicly", "Voters like it; the accused will hit back.", { effect: { people: 3, allies: -1 }, tension: 4 }],
  ],
  cobalt: [
    ["protect", "Battery metal stockpile", "Keeps factories running if the mines stay shut.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Recycle old batteries", "Metal you already own cannot be seized.", { effect: { economy: -1, people: 2, allies: 1 } }],
    ["quick", "Buy from the generals", "Cheap metal now; it funds the coup.", { effect: { economy: 4, allies: -3 } }],
    ["tough", "Send military advisers", "Protects your mining firms and stirs the region.", { effect: { military: 2, economy: 1, allies: -2 }, tension: 4 }],
  ],
  nuclear: [
    ["protect", "Missile defence", "Shields your cities if the arms race starts.", { effect: { economy: -2, military: 1 }, shield: true }],
    ["invest", "Deepen alliances", "Friends make you a harder target than missiles do.", { effect: { allies: 3, military: -1 } }],
    ["quick", "Sell arms to the region", "Frightened neighbours pay well.", { effect: { economy: 4, allies: -2 } }],
    ["tough", "Large military drills", "Shows resolve; the region gets more nervous.", { effect: { military: 3, people: 1, allies: -3 }, tension: 6 }],
  ],
  refugees: [
    ["protect", "Reception centres at the border", "Order at the border if the crisis spreads.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Work permits for refugees", "New workers fill jobs; some voters grumble.", { effect: { economy: 2, people: -1, allies: 2 } }],
    ["quick", "Pay a neighbour to stop them", "The problem moves elsewhere, for now.", { effect: { people: 2, allies: -2 } }],
    ["bet", "Fund the UN appeal", "Pays off only if shared resettlement works.", { effect: { economy: -2 }, ifWin: { allies: 4 } }],
  ],
  deepfakes: [
    ["protect", "Fact-checking unit", "Fakes get caught quickly if the wave keeps rising.", { effect: { economy: -1 }, shield: true }],
    ["invest", "Media lessons in schools", "A public that spots fakes protects every election.", { effect: { people: 3, economy: -1 } }],
    ["quick", "Ban foreign apps", "Fewer fakes, and partners call it censorship.", { effect: { people: 2, military: 1, allies: -2 } }],
    ["bet", "Back the AI labels deal", "Pays off only if shared AI rules pass.", { effect: { economy: -1 }, ifWin: { people: 3, allies: 1 } }],
  ],
};

export const RESPONSES: Record<string, ResponseDef[]> = Object.fromEntries(
  Object.entries(ROWS).map(([crisis, rows]) => [crisis, rows.map(([kind, name, why, rest]) => ({ id: `${crisis}.${kind}`, kind, name, why, ...rest }))]),
);

export const RESPONSE_BY_ID = new Map(Object.values(RESPONSES).flat().map((r) => [r.id, r]));
