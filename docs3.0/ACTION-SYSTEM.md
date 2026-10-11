# Statecraft 3.0 — Action System

How a leader turns an idea into something the world simulates.

## 1. Principles

1. **Capabilities, not a menu.** The game offers verbs a country can use. The player combines them with any target, resource, amount, duration and condition.
2. **Words in, card out.** Free text is never executed directly. It becomes an order card the player can see and edit.
3. **AI translates, engine decides.** The language model fills the card. The deterministic engine computes every number.
4. **Ask, never guess.** If a required value is missing or the meaning is unclear, the game asks with chips. It never invents an important parameter silently.
5. **You can ask for anything; the world does not have to allow it.** The validator shows what is feasible and why.
6. **Doing nothing is a choice.** An empty round is allowed and has its own consequences (drift, missed chances).

## 2. Three ways in, one result

| Way in | Who uses it | Example |
|---|---|---|
| **Chip** (quick action) | New players, fast rounds | Tap `Cut imports` then pick `Oil`, `Russia`, `40%` |
| **Composer** (fill the card) | Players who like precision | Open a blank card and set each field |
| **Free text** | Players with their own idea | "Russia se oil 40% kam karo aur Saudi se zyada lo" |

All three produce the same **order card**. The engine never knows how the card was made. This keeps the game fair: typing well gives no hidden advantage.

## 3. The order card

```ts
type OrderCard = {
  verb: Verb;                  // from the vocabulary in §4
  actor: CountryCode;          // always the player's country
  target?: CountryCode | "WORLD";
  resource?: Good | Sector;    // oil, grain, tech, minerals; health, education, defence…
  amount?: { value: number; unit: "%" | "$B" | "units" };
  duration?: number;           // rounds; default 1, always shown
  condition?: Condition;       // proposals only in the slice (see DIPLOMACY.md)
  visibility: "public" | "private";
  note?: string;               // the player's own words, kept for the Chronicle
  source: "chip" | "composer" | "text";
};
```

Rules:

- A card lists every field it uses. Defaults are shown in a muted style with a "default" tag, so the player sees what the game assumed.
- One sentence can produce several cards ("cut Russian oil and buy Saudi oil" gives two). Each card uses one order slot (decision E-2: 3 slots per round).
- The player's own words stay on the card as `note`. The Chronicle can quote them: *India announced it would "stop depending on one supplier".*

## 4. Vocabulary (first slice)

Verbs are the game's real rules. Each verb has an engine function, a cost formula and a cause-chain template.

| Group | Verb | Parameters | What the engine does |
|---|---|---|---|
| Trade | `BUY` | resource, target or WORLD, amount, duration | Moves supply, pays at world price, raises demand |
| Trade | `SELL` | resource, target or WORLD, amount, duration | Earns revenue, lowers own reserve |
| Trade | `RESTRICT_IMPORT` | resource, target, amount %, duration | Cuts a flow; buyer must find another supplier |
| Trade | `RESTRICT_EXPORT` | resource, target, amount %, duration | Embargo; raises world price, hurts seller revenue |
| Trade | `TARIFF` | resource or ALL, target, rate %, duration | Raises import price; target trust falls |
| Economy | `SHIFT_BUDGET` | sector, amount % GDP | Moves money between ministries |
| Economy | `BUILD` | project type, count, region (optional) | One-off project; cost and build time from tables |
| Economy | `SUBSIDISE` | sector or resource, $B, duration | Lowers local price, costs treasury |
| Economy | `STOCKPILE` | resource, amount | Builds a reserve against shocks |
| Diplomacy | `PROPOSE` | target, gives[], wants[], duration | Sends a proposal card (DIPLOMACY.md) |
| Diplomacy | `OFFER_AID` | target, resource or $B | Gift; trust and standing rise |
| Diplomacy | `REQUEST` | target, resource or support | Asks for help; the reply is a proposal |
| Diplomacy | `STATEMENT` | text, target (optional) | Public words on the World Wire; small standing effect, no material effect |

Security verbs (`MOBILISE`, `DEPLOY`, `STRIKE`, `RECON`) and intelligence verbs come after the slice, using the 2.0 conflict rules ([2.0 GAME-DESIGN §8](../docs2.0/GAME-DESIGN.md#8-conflict)).

Why this feels open: 13 verbs × 4 countries × 4 goods × free amounts × free durations × combinations in one sentence gives far more distinct plans than a list of 30 buttons, and every plan has a real, computed result.

## 5. The interpreter (free text to cards)

The AI receives:

- the player's sentence (English, Hindi or Hinglish);
- the player's country and the list of countries in the match;
- the verb vocabulary as a strict schema;
- a short summary of the current world (prices, active deals) so that "the deal we made last round" can be resolved.

It returns one of four results:

| Result | When | What the player sees |
|---|---|---|
| `cards` | The meaning is clear | One or more order cards to confirm |
| `ask` | A required field is missing or unclear | The card with the unclear field highlighted and chips to choose from |
| `unsupported` | The idea has no verb yet | "The world can't do this yet" plus the closest verbs; the idea goes to the wish list (§9) |
| `refused` | The idea breaks content rules (§8) | A short reason and the closest allowed action |

The interpreter never returns numbers for consequences. It may only copy numbers the player wrote ("40%").

### Examples

| Player writes | Result |
|---|---|
| "Russia se oil imports 40% kam karo aur Saudi se zyada oil lo" | Card 1 `RESTRICT_IMPORT oil ← RUS 40%`; card 2 `BUY oil ← SAU` with amount **asked** (chips: 10%, 20%, match the cut) |
| "China ko sabak sikhao" | `ask`: What kind of pressure? `Trade` `Tariff` `Statement` `Diplomatic` `Something else…` |
| "Build 200 hospitals in UP" | `BUILD hospital ×200 region=UP` |
| "Make China's president resign" | `unsupported`: closest verbs `STATEMENT`, `TARIFF`, `PROPOSE` |
| "Bomb their cities" | `refused`: civilians are never a target; closest allowed action shown when security verbs exist |

## 6. The validator (what the world allows)

The validator runs after the card is confirmed and again at round lock. It is plain TypeScript, part of the engine package, and it uses the current world state.

Checks:

- **Treasury:** can the country pay this round?
- **Capacity:** can the seller export this much? Can the buyer's ports and refineries take it?
- **Existing deals:** does the card break an accepted treaty? (Allowed, but the card warns: "This breaks your deal with China; trust −15.")
- **Real flows:** does this trade flow exist at all? Example: China is not an oil exporter to India, so "cut oil from China by 40%" returns *"India imports almost no oil from China. Did you mean Russia or Saudi Arabia?"*
- **Slots and repeats:** one card per verb and target per round.

When a request is only partly possible, the card shows both values:

```
REQUESTED   +500% oil from Russia
FEASIBLE    +18%   (Russian export capacity left this round)
[Use 18%]  [Edit]  [Cancel]
```

## 7. Forecast on the card

Before confirming, the card shows a short engine forecast, computed with the same functions as the real resolve but without other players' orders:

```
Treasury −$1.2B · Oil price +4% · Russia trust −8 · Approval +1 (energy security)
```

The real result can differ because other leaders act in the same round. The card says so: *"Forecast assumes no one else reacts."* The difference between forecast and result is part of the fun.

## 8. Content rules for free text

Free text extends the 2.0 content rules ([2.0 PRD §10](../docs2.0/PRD.md#10-content-and-safety-rules)):

- Civilians, ethnic or religious groups are never targets.
- No nuclear use; no chemical or biological weapons.
- No real living person is harmed, insulted or impersonated in game text. Leaders are referred to by role.
- `STATEMENT` text is checked before it reaches the World Wire. Abusive text is blocked, and the player sees why.
- Everything the game invents is labelled **Simulated**.

## 9. The wish list

Every `unsupported` result is stored with the sentence (anonymised) and the closest verbs. Each week the team reviews the top requests. Common ideas become new verbs in later releases. The release note tells players: *"You asked for it: `SANCTION_BANKS` is now in the world."*

## 10. Fallbacks

- If the AI is slow or down, the order bar shows the chips and the composer only. The game is fully playable without free text.
- If the AI misreads, the player edits the card. A "Wrong? Fix it" link opens the composer with the fields filled.
- The engine never calls the AI during resolve or replay. A confirmed card is plain data, so replays stay deterministic.
