# Statecraft 4.0 — Actions and Cards

| Field | Value |
|---|---|
| Version | 4.0 (final plan for review) |
| Date | 2026-10-11 |
| Related | [GAME-DESIGN §7](GAME-DESIGN.md#7-cards-and-actions-summary) · [SYSTEMS](SYSTEMS.md) · [UI-DESIGN §5.5.4](UI-DESIGN.md#554--actions-cards) |

> **Rule:** the library is large; what one turn shows is small. Cards are the game's vocabulary. Free text, when it comes, is only another way to pick and fill a card.

---

## 1. Three kinds of decision

| Kind | Where | Costs | Example |
|---|---|---|---|
| **Budget** | Budget step | Money only | Move $8B from Defence to Energy |
| **Project** | Projects step | Money over 1–5 turns, a slot | Build a Semiconductor Fab |
| **Card** | Actions step | 0–2 PC and sometimes money | Impose a 25% tariff on China |

Crisis choices (from world events) are a fourth, free kind; see §6.

## 2. Card schema

```ts
interface CardDef {
  id: string;                         // 'trade.tariff'
  group: 'economy' | 'trade' | 'energy' | 'food' | 'people' | 'diplomacy';
  name: string;                       // 'Impose Tariff'
  pc: 0 | 1 | 2;
  cost?: (s: CountryState) => number; // $B, from % of GDP
  params: ParamDef[];                 // target country, good, rate, units, turns …
  legal: (w: WorldState, me: Iso3, p: Params) => true | LockReason;
  relevance: (w: WorldState, me: Iso3) => number;   // §4
  apply: (ctx: ResolveCtx, me: Iso3, p: Params) => void;  // writes state + cause records
  forecastLabel: string;              // template for the preview line
  learn?: string;                     // glossary term id for the term chip
}
```

Cards live in `lib/game/engine/cards/` as data plus small functions. Adding a card never touches the UI: the UI renders any `CardDef`.

## 3. Library v1 (32 cards)

Costs are % of GDP; the UI shows $B. Effects are the main ones; [SYSTEMS](SYSTEMS.md) gives the formulas.

### Economy (6)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| Stimulus Package | 1 | 1.0% | Growth +0.8 this turn; inflation +0.6; deficit up | Always |
| Austerity Drive | 1 | — | Deficit −1% GDP; growth −0.5; stability −4; rating may rise | Always |
| Open to Foreign Investment | 1 | — | Investment +0.5% GDP; industry +2 | Stability ≥ 45 |
| Special Economic Zone | 1 | 0.3% | Industry +4, tech production +3% over 2 turns, jobs | Infrastructure ≥ 40 |
| Print Money | 1 | — | Treasury +2% GDP; inflation +4; rating −1 step | Not used last turn |
| IMF Programme | 2 | — | Treasury +3% GDP; for 3 turns welfare and defence capped at baseline; stability −6 | Rating ≤ BB or treasury < 1% GDP |

### Trade (6)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| Impose Tariff | 1 | — | Tariff 10% or 25% on a country (see SYSTEMS §5.4) | No tariff already at that rate |
| Cut Tariffs | 1 | — | Removes your tariff on a country; relations +6; prices − | A tariff exists |
| Sanction | 2 | — | Sanction a country (SYSTEMS §5.4) | Not already sanctioning |
| Lift Sanction | 1 | — | Ends your sanction; relations +10 | Sanction active |
| Embargo | 1 | — | Stop selling one good to a country | You export that good |
| Export Push | 1 | 0.1% | Sell +10% extra of one good to the market at −5% price | Surplus in that good |

### Energy (5)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| Secure Oil Imports | 1 | — | Priority purchase of up to N energy units from one supplier's surplus this turn at world price +5% | Supplier has surplus; no embargo |
| Fuel Subsidy | 0 | 0.3% | Halves the energy-price effect on inflation this turn; stability +3 | Energy price ≥ 110 |
| Efficiency Drive | 1 | 0.2% | Energy demand −3%, permanent | Not used in the last 2 turns |
| Raise Output | 1 | — | Energy production +5% this turn; world price falls | Energy exporter |
| Cut Output | 1 | — | Energy production −5% this turn; world price rises | Energy exporter |

### Food (4)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| Release Grain Reserves | 0 | — | Food reserve → supply this turn | Food reserve > 0 |
| Ban Food Exports | 1 | — | Domestic supply up; world food price up; relations −8 with importers | Food exporter |
| Emergency Food Imports | 1 | — | Priority purchase of food from the market this turn | Food supply < 100% |
| Farm Support Programme | 1 | 0.2% | Food production +3% next turn; stability +2 | Always |

### People (5)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| Jobs Guarantee Scheme | 1 | 0.4% | Unemployment −0.5; stability +3; inflation +0.2 | Unemployment ≥ 4% |
| Skills Drive | 1 | 0.15% | Skills +2 now (no lag) | Always |
| Health Campaign | 1 | 0.2% | Health +4 | Always |
| Cash Transfers | 0 | 0.5% | Stability +5 this turn; inflation +0.4 | Stability < 60 |
| Labour Reform | 2 | — | Productivity trend +0.3 permanent; stability −5 now | Stability ≥ 40 |

### Diplomacy (6)

| Card | PC | Cost | Effect | Legal when |
|---|---|---|---|---|
| **Propose Deal** | 1 | per terms | Opens the proposal composer ([GAME-DESIGN §8](GAME-DESIGN.md#8-diplomacy)) | Always (pinned) |
| Foreign Aid | 1 | chosen | Relations +10 with the receiver; influence + | Treasury allows |
| Summit Diplomacy | 1 | — | Relations +6, trust +4 with one country; tension −2 | Relations > −50 |
| Pressure | 1 | — | Demand one term from a weaker country (stop buying from X, cut a tariff). The target accepts or refuses; refusal: tension +5, relations −12 | Your military + allies > target × 1.2 |
| Join Sanction | 1 | — | Join an existing sanction on a country (adds to its strength) | Someone sanctions the target |
| Cancel Treaty | 0 | — | Ends a treaty early; broken-treaty penalties ([GAME-DESIGN §8.3](GAME-DESIGN.md#83-trust-and-broken-promises)) | Treaty active |

The library grows by adding rows: later groups include Tech (export controls, chip alliance), Security (mobilise, naval escort, arms sale) and Conflict (S8).

## 4. Choosing the 5–7 cards for a turn

`suggestCards(world, me)` runs in the engine, so bots, the UI and tests share it.

```
for each card in library:
  if legal(card) is not true: skip            // it still appears in the drawer with its lock reason
  score = relevance(card)                     // card-specific triggers, examples below
        + 10 if the card's group matches the scenario
        + 25 if an event this turn or last turn hit the card's area
        + 15 if it continues something active (a treaty, a project, a sanction on you)
        + 5  if it was not shown last turn
        − 10 if you played it last turn
pick, in score order, with at most 2 cards per group: 5 cards
add 1 "opportunity" card: the best-scoring card from a group not yet shown
add "Propose Deal" (pinned)
ties: seeded RNG stream 'cards'
```

Examples of `relevance`:
- Energy cards: `+40 × energyShort`, `+20 if price.energy ≥ 115`.
- Food cards: `+40 × foodShort`, `+30 if a drought event hit you`.
- Jobs Guarantee: `+6 × (unemployment − unemployment₀)`.
- Sanction: `+20 if relations with the target < −30`, `+15 if an ally sanctions the target`.
- Lift Sanction: `+25 if the sanction costs you more than 0.3% GDP`.

Result: **6 cards** on a normal turn (5 + Propose Deal), **7** on a crisis turn (one extra crisis-group card).

## 5. The "All actions" drawer

- Opens from a button under the suggested cards and with the `A` key.
- Lists every card in the six groups, with a search box (the existing `cmdk` component).
- Locked cards stay visible, dimmed, with the reason: "Needs: energy exporter", "Not enough PC (needs 2)", "Already sanctioning Russia".
- Playing from the drawer is the same as playing a suggested card.

This removes the risk that the player feels a move is hidden. Suggested cards make decisions fast. The drawer keeps the full freedom.

## 6. Crisis choice cards

A world event that hits a country hard adds a **crisis card** to that country's next briefing.

```ts
interface CrisisDef {
  id: string;                   // 'food.monsoonFailure'
  trigger: (w, me) => boolean;
  title: string; body: string;  // with term chips
  advisors: { finance: string; foreign: string; people: string };
  choices: { id: string; label: string; effects: EffectDef[]; realWorld?: string }[];  // 2–3
  defaultChoice: string;        // used if the player does not choose ("wait and see")
}
```

- Choosing is free (no PC) and fast (one tap).
- Each choice has a short forecast line.
- v1 has one crisis card per event (16).

## 7. Orders tray

Every decision in the turn becomes an **order chip** in a tray at the bottom of the command panel:

```
Orders · 2026     PC ●●○  ·  $B −29
[Budget: Energy +$8B ✎] [Project: Oil Reserve ✎] [Deal → Russia ⏳ pending ✎] [+]
                                                               [ Lock turn ]
```

- Tapping a chip reopens it for editing. Removing a chip refunds its PC and money.
- A pending proposal shows its state live: pending, accepted, countered, rejected.
- The tray shows total PC and money used, so the player always knows what is left.

## 8. Free-text order bar (S7, optional)

Free text adds speed and the feeling of "my own words". It never adds power: it produces the same cards.

```
✎ What do you want to do?   "secure russian oil for 3 years"
            ↓ keyword parser (no LLM)
┌ PROPOSE DEAL · India → Russia ─────────────────┐
│ Wants: energy 4 units / turn   Duration: 3      │
│ Gives: [choose]                                  │
│                         [Edit]  [Add to orders] │
└──────────────────────────────────────────────────┘
```

**Parser** (`lib/game/parse/`):
- **Verbs → cards:** a synonym table ("buy", "secure", "import", "get" + a good → Secure Imports or a supply proposal; "tariff", "tax imports" → Impose Tariff; "sanction", "punish" → Sanction).
- **Entities:** country names and adjectives ("Russia", "Russian", "Moscow"), goods ("oil", "gas", "fuel", "petrol" → energy; "wheat", "rice", "grain" → food; "chips", "semiconductors" → tech), numbers and durations ("3 years", "for 5 turns", "25%").
- **Hinglish keywords** for the main audience: "tel" → energy, "anaaj", "gehun", "chawal" → food, "kharido", "lo" → buy, "rok do", "band karo" → stop or embargo.
- **Output:** one filled card if the match is confident; otherwise "Did you mean?" with the 3 closest cards. Never a dead end.
- Unmatched sentences are logged (anonymously) to a wish list. The most common become new cards.
- A golden test set of 150 sentences must reach 80% exact card + target match before release.

A language model can replace the parser later without changing anything else, because the output is still a card. That decision is not needed for the MVP.
