# Statecraft 4.0 — Simulation Systems

| Field | Value |
|---|---|
| Version | 4.0 (final, 2026-10-11) |
| Date | 2026-10-11 |
| Related | [GAME-DESIGN](GAME-DESIGN.md) · [ACTIONS](ACTIONS.md) · [MULTIPLAYER](MULTIPLAYER.md) |

This document defines the engine: what it stores, how one turn is computed, and how every change is explained. All constants are **starting values** in `lib/game/engine/rules.ts`. Bot self-play and playtests tune them.

The engine is the heart of the game. It has no AI and no randomness outside a seeded generator. The same state and the same orders always give the same result.

---

## 1. System map

```
                    POPULATION ──► workforce ──► EMPLOYMENT ◄── industry, growth
                        │                            │
                needs: food, energy, jobs      household income
                        │                            │
   ENERGY · FOOD · TECH ┴──► supply ratio ──► GROWTH ◄┘
          ▲                                   │   │
   production, treaties,                      │   └──► INFLATION ◄── prices, deficits, tariffs
   world market, prices                       ▼
          ▲                                  GDP ──► REVENUE (tax) ──► TREASURY ──► BUDGET
          │                                   │                           │        PROJECTS
   TRADE: tariffs, sanctions, deals           │                           ▼        CARDS
          │                                   ▼                    ministry indices
   DIPLOMACY: relations, trust, influence   STABILITY ◄── jobs, prices, shortages, health
          │                                   │
          └────────── TENSION ◄── hostile acts, military spending
                                              │
                                     WORLD POWER INDEX · LEADER SCORE
```

Every arrow is a term in a formula below, and every term writes a **cause record** (§9).

## 2. State

```ts
interface CountryState {
  iso3: 'IND' | 'CHN' | 'USA' | 'RUS' | 'SAU' | 'JPN';

  // Economy ($B values shown to players; rules use % of GDP)
  gdp: number;              // $B per year
  growth: number;           // % this year
  inflation: number;        // %
  treasury: number;         // $B cash
  debt: number;             // $B; debtPct = debt / gdp
  rating: Rating;           // 'AAA' … 'CCC', derived
  taxRate: number;          // 10–35 (% of GDP)
  budget: Record<Ministry, number>;     // % of GDP per ministry
  baseline: Record<Ministry, number>;   // real starting spend, % of GDP
  resourceRent: number;     // share of export earnings that reach the treasury (SAU .6, RUS .35, others .05)

  // People
  population: number;       // millions
  popGrowth: number;        // % per year (IND 0.8, CHN −0.1, USA 0.5, RUS −0.3, SAU 1.5, JPN −0.5)
  workforce: number;        // millions
  workforceGrowth: number;  // % per year (IND 1.2, CHN −0.3, USA 0.4, RUS −0.5, SAU 2.0, JPN −0.6)
  unemployment: number;     // %
  productivityTrend: number;// % per year
  skills: number;           // 0–100
  health: number;           // 0–100
  stability: number;        // 0–100

  // Capacity (0–100 indices)
  industry: number;
  infrastructure: number;
  tradeCapacity: number;    // units per turn the country can move through ports and pipelines
  military: number;

  // Goods (units are abstract; 1 unit ≈ 1% of the world's yearly trade in that good)
  goods: Record<Good, { prod: number; demand: number; reserve: number }>;

  // Standing
  influence: number;        // 0–100
  pc: number;               // Political Capital available
  projects: ActiveProject[];
  slots: number;
  flags: string[];          // 'unrest', 'caretaker', …
}

type Ministry = 'industry' | 'infrastructure' | 'agriculture' | 'energy' | 'education' | 'welfare' | 'defence';
type Good = 'energy' | 'food' | 'tech';

interface PairState {          // one per ordered pair a→b
  relations: number;           // −100 … 100
  trust: number;               // 0 … 100
  tariff: number;              // % on imports from b
  sanction: boolean;
  embargo: Good[];
}

interface WorldState {
  turn: number; year: number; seed: number; scenario: ScenarioId;
  price: Record<Good, number>; // index, 100 = start
  tension: number; globalGrowth: number;
  countries: Record<Iso3, CountryState>;
  pairs: Record<Iso3, Record<Iso3, PairState>>;
  treaties: Treaty[];
  market: Record<Good, { supply: number }>; // World Market capacity
  log: WorldEvent[];
}
```

## 3. Budget and money

```
revenue      = gdp × taxRate/100
exportRent   = exportEarnings × resourceRent
interest     = debt × interestRate(rating)
ministrySpend= gdp × Σ budget[m] / 100
projectSpend = Σ instalments due this turn
dealMoney    = grants, loans and investments paid (−) or received (+)

treasury'    = treasury + revenue + exportRent − ministrySpend − projectSpend − interest + dealMoney
if treasury' < 0:  debt += −treasury';  treasury' = 0          // automatic borrowing
```

**Credit rating** comes from debt % of GDP, growth and stability. It sets the interest rate: AAA 2%, AA 2.5%, A 3%, BBB 4.5%, BB 6.5%, B 9%, CCC 14%. Japan's very high debt works because its starting rating input includes a "domestic savings" factor of 0.5 on debt (curated per country).

**Ministry indices** move toward a target with lag and diminishing returns:

```
target(index) = clamp(50 + 25 × log2(spend / baseline), 0, 100)
index'        = index + (target − index) × speed
speed: welfare .30, defence .20, industry .20, agriculture .20, energy .15, infrastructure .15, education .10
```

| Ministry index | Feeds |
|---|---|
| industry | `industry` capacity; jobs (§6) |
| infrastructure | `infrastructure`, `tradeCapacity` (+2% per 10 points), growth potential |
| agriculture | food production (+3% per 10 points above 50) |
| energy | energy production (+2.5% per 10 points above 50) |
| education | `skills` after a 3-turn delay |
| welfare | `health`, stability now; inflation if spend > 1.5 × baseline |
| defence | `military` (§8) |

## 4. Growth and GDP

```
growth = potential + supply + demand + globalGrowth − drags

potential = trend[country]
          + 0.04 × (skills − 50) + 0.03 × (infrastructure − 50) + 0.02 × (industry − 50)
          + workforceGrowth

supply    = −8 × energyShort − 4 × foodShort − 5 × techShort        // short = max(0, 1 − supplyRatio)

demand    = 0.3 × fiscalImpulse + 0.3 × Δ(exportEarn% − importBill%) vs start + 0.5 × investmentReceived%

drags     = 0.02 × max(0, debtPct − 90)
          + 0.15 × max(0, inflation − 6)
          + sanctionHit                     // §5.4
          + (tension ≥ 70 ? 0.5 : 0)
          + (stability < 30 ? 1.0 : 0)

gdp' = gdp × (1 + growth / 100)
```

`fiscalImpulse` is the change in the budget deficit as % of GDP. Spending more than you earn lifts growth this year and costs debt later.

## 5. Goods, trade and prices

### 5.1 Production and demand

```
prod'(energy) = prod × (1 + energyMinistryEffect + projectEffects)
prod'(food)   = prod × (1 + agricultureEffect + projectEffects) × weatherFactor   // events
prod'(tech)   = prod × (1 + 0.01 × (industry − 50) + projectEffects)

demand'(energy) = demand × (1 + 0.6 × growth/100 − efficiency)    // efficiency from renewables projects
demand'(food)   = demand × (1 + popGrowth/100 + 0.2 × perCapitaGrowth/100)
demand'(tech)   = demand × (1 + 0.8 × growth/100)
```

### 5.2 Flows, in this order

1. **Treaties.** Each supply treaty moves its units from seller to buyer, limited by both sides' `tradeCapacity` and by sanction friction (§5.4). A contract can cut into the seller's own supply down to 90% of its demand.
2. **Priority purchases** from cards (Secure Oil Imports from a named supplier; Emergency Food Imports from the market).
3. **World Market.** Exporters sell their remaining surplus to the market. Countries still short buy from the market. If the market is short, buyers get a pro-rata share. Leading partner regions gives a discount (2% per region, cap 8%); embargoes and sanctions add a premium.
4. **Reserves.** A country still short draws half the gap from its reserve (all of it with Release Reserves). A country fully supplied refills 10% of its reserve capacity per turn.

The rest of the world grows 2.2% a year in both supply and demand. Its supply also answers prices: `baseSupply × (1.022 + 0.006 × (price − 100))`.

```
supplyRatio = (prod + treatyIn − treatyOut + reserveDraw + marketIn) / demand
```

### 5.3 Prices

```
target(price) = 100 × (worldDemand / worldSupply) ^ elasticity     // energy 2.5, food 2.0, tech 1.5
price'        = 0.5 × price + 0.5 × target(price)                    // smoothing
```

- Importers pay `marketIn × price`. The import bill is a drag on GDP and adds to inflation.
- Exporters earn `marketOut × price`. Part of it reaches the treasury through `resourceRent`.
- A treaty price is the world price at signing, with the agreed discount or premium, fixed for its duration. Long contracts protect buyers from price spikes; this is why players sign them.

### 5.4 Tariffs, sanctions and embargoes

**Tariff** `t` (%) by A on B:
- A's imports from B cost `+t%`. A's industry `+0.05 × t`. A's inflation `+0.02 × t × importShareFromB`.
- B's exports to A fall by `0.8 × t%`. Relations A→B −10 once, tension +2.

**Sanction** by A on B:
- A–B trade stops.
- `strength = Σ GDP share of all countries sanctioning B` (0–1).
- B's trade with others needs a discount of `10% × strength` (friction). B's growth `−1.5 × strength` (sanctionHit).
- **Leakage:** `1 − 0.5 × strength` of B's blocked exports reach the market through third countries. Players see why sanctions rarely stop trade fully.
- Relations A→B −15 once and −3 per turn. Tension +4.

**Embargo** of good `g` by A on B: A stops selling `g` to B, directly and through treaties.

## 6. Population and employment

Population is **potential and responsibility**. A larger population gives a larger workforce and market, and also larger needs for food, energy and jobs.

```
population' = population × (1 + popGrowth/100)
workforce'  = workforce  × (1 + workforceGrowth/100)

growthNeeded = productivityTrend + workforceGrowth          // growth needed to hold unemployment flat
unemployment' = unemployment
              − 0.3 × (growth − growthNeeded)              // Okun's law (floor: 60% of the start rate)
              − jobsFromIndustry                           // 0.03 × (industry index change)
              − programmes                                 // Skills & Apprenticeships, Industrial Corridor, Jobs card
clamp(unemployment', 1.5, 30)

skills'  = skills  + (educationIndex[t−3] − skills) × 0.10    // three-turn lag
health'  = health  + (welfareIndex − health) × 0.20
```

Teaching moment: India needs about 5.8% growth (4.6% productivity + 1.2% workforce) just to keep unemployment where it is. Japan's workforce shrinks, so low growth does not raise its unemployment. The Why chain names Okun's law with a term chip.

## 7. Inflation and stability

```
inflation' = 0.5 × inflation + 0.5 × anchor[country]
           + 0.04 × energyImportShare × (price.energy − 100)
           + 0.03 × foodImportShare  × (price.food − 100)
           + 0.4 × max(0, deficitPct − 3)
           + 0.5 × anyShortage
           + tariffEffects + welfareOverspend
```

```
stabilityTarget = 60
                − 1.5 × (unemployment − unemployment₀)
                − 1.2 × max(0, inflation − 5)
                + 0.3 × (health − 50)
                − 15 × foodShort − 10 × energyShort
                + 2 × treatiesKeptThisTurn
                − crisisHits
stability' = stability + (stabilityTarget − stability) × 0.35
```

- **Unrest** (stability < 30): growth −1, PC −1 next turn, news headline.
- **Government crisis** (stability < 15): PC −2 next turn and the bot advisor warns that the leader may fall (elections come in a later step).

## 8. Diplomacy, influence, tension and military

```
relations' = relations × 0.95                    // drift toward 0
           + 2 per active treaty between the pair
           + one-off: aid +10, treaty signed +8, tariff −10, sanction −15, pressure −12, broken treaty −30

influence' = clamp( 0.3 × avgRelations(normalised 0–100)
                  + 3 × activeTreaties + 2 × aidGiven%GDP
                  + 0.2 × (economyDim − 50), 0, 100 )

tension'   = tension − 3
           + Σ hostile acts (sanction +4, tariff +2, pressure +5, embargo +3)
           + 1 per 10% that any country's defence spend is above baseline
           − 2 per new treaty

military'  = military + 0.6 × (defenceIndex − 50) / 10 + projects − 0.5
```

### 8.1 Partner regions and sway

```
sway'[r][seat] = sway × 0.97                                  // slow fade without effort
               + 0.2 per supply unit traded with the region this turn
               + 60 per % of GDP of aid sent to the region (0.1% of GDP = +6)
               + 8 per Regional Investment card
               + 5 if the seat voted Yes on a resolution that serves the region
               − 6 if the seat sanctions or embargoes a country the region depends on
normalise so Σ sway[r] ≤ 100
leader(r) = argmax(sway[r]) if max ≥ 25, else none
```

Leading a region: influence +2 per turn; World Market purchase price −2% per region led (cap −8%). The globe tint for a region uses the leader's seat colour at opacity `0.15 + 0.45 × sway/100`.

### 8.2 Trends

```
trend(dim) = least-squares slope of dim over the last 3 turns
Improving if trend > +2 per turn · Worsening if < −2 · otherwise Unchanging
```

### 8.3 World Vote

```
passes = count(Yes) ≥ 4
relations[a][b] += 4 if a and b voted the same way (both Yes or both No)
relations[a][b] −= 3 if one voted Yes and the other No
effects are data in the resolution deck; they start next turn and last 3 turns
```

## 9. Cause records and the Why chain

Every formula term that changes a value writes a record:

```ts
interface Cause {
  id: string;            // stable: `${turn}:${phase}:${n}`
  field: string;         // e.g. 'IND.industry'
  delta: number;
  label: string;         // template key, e.g. 'cause.fuelShortageRemoved'
  actor?: Iso3;          // who caused it (a player's card, an event, the market)
  sourceRef?: string;    // card id, treaty id, event id
  parent?: string;       // the cause that produced the input to this term
}
```

- Records are linked by `parent`. The Why chain for a field walks the parents up to the root moves (a card, a treaty, an event, a price).
- The UI shows the **top 3 contributors** of a change and groups the rest as "Other effects".
- A record is created only when `|delta|` is above the display threshold (0.1 for indices, 0.05 for percentages), so chains stay short.
- Chains are stored per turn in `events` for the end-of-match history and for replays.

## 10. Resolution order

`resolveTurn(state, orders, rng)` runs these phases in a fixed order. All seats act on the **start-of-turn state**, so simultaneous moves are fair.

1. **Validate** every order (money, PC, slots, legality). Illegal orders are dropped with a reason event shown to the player.
2. **Treaties:** create from accepted proposals; pay money terms; expire finished treaties; apply broken-treaty penalties.
3. **Budget and tax:** revenue, spending, ministry indices.
4. **Projects:** instalments, progress, completions.
5. **Cards:** domestic and trade-policy cards (tariffs, sanctions, embargoes, programmes), simultaneously.
6. **World event, World Vote result and crisis choices** for this turn.
7. **Goods:** production, demand, treaty flows, reserves, market, prices.
8. **Macro:** growth, GDP, employment, population, inflation, debt, rating.
9. **People:** stability, unrest.
10. **Diplomacy:** relations, trust, region sway, influence, tension, military.
11. **Scores:** Power Index dimensions, trends, Leader Score, objectives; early warnings for next turn (from a forecast with no orders).
12. **Output:** cause records, news items, history entries, globe events for the replay.

## 11. Scores

Each Power dimension is an **absolute** 0–100 value computed from the country's own state, so it can be compared over time and between countries.

```
economy     = clamp(18 × log10(gdp $B) − 20 + 2 × growth)
development = clamp(0.35 × skills + 0.25 × health + 0.25 × (100 − 4 × unemployment) + 3 × perCapitaGrowth)
security    = clamp(0.5 × military + 25 × min(1, energyRatio) + 25 × min(1, foodRatio))
diplomacy   = clamp(0.6 × influence + 0.4 × avgTrust)
stability   = clamp(0.7 × stability + 0.3 × (100 − 3 × max(0, inflation − 3) − 0.2 × max(0, debtPct − 90)))

powerIndex  = 0.25 economy + 0.20 development + 0.20 security + 0.20 diplomacy + 0.15 stability
```

Leader Score is defined in [GAME-DESIGN §12.2](GAME-DESIGN.md#122-leader-score-who-wins). Improvement = `6 × handicap × mean(soft(dimension_now − dimension_par))`, with `soft(x) = sign(x) × 10 × ln(1 + |x| / 10)`, clamped to ±300. `dimension_par` comes from the same match played with no orders (computed once at match creation).

## 12. Determinism

- RNG: `mulberry32(hash(matchId, turn, purpose))`. Separate streams for events, bot tie-breaks and card selection, so adding a bot choice does not change the event sequence.
- No `Date.now()`, no `Math.random()`, no unordered iteration: countries are processed in sorted ISO3 order. A lint rule bans `Math.random` in `lib/game/engine/`.
- Values are rounded to 2 decimals at the end of each phase.
- Every match stores `ENGINE_VERSION`, the seed and every order, so any match can be replayed exactly. This is used for tests, for the end-of-match history and for verifying solo results (see [MULTIPLAYER §7](MULTIPLAYER.md#7-solo-mode-and-result-verification)).

## 13. Forecast

`forecast(state, myOrders)` runs the same `resolveTurn` with no orders from other seats and no world event. The UI uses it for slider previews and card previews. The result is labelled "Forecast" because other leaders and events can change the real outcome. The gap between forecast and actual is part of the fun (see [ENGAGEMENT §2](ENGAGEMENT.md#2-the-reveal)).

## 14. Worked example: India, turn 1, Energy Shock

| Step | Value |
|---|---|
| Revenue | $4,200B × 19% = $798B |
| Ministry spend | 15.35% of GDP ≈ $645B |
| Oil reserve project | 0.2% of GDP = $8.4B |
| Investment to Russia (treaty) | −$12B |
| Interest | $3,444B debt × 4.5% ≈ $155B (shown as its own line) |
| Treasury | $118B + 798 − 645 − 8.4 − 12 − 155 ≈ $96B |
| Energy supply ratio | 0.88 before the treaty → 0.97 after 5 treaty units (1 unit delayed by sanctions) |
| Supply effect on growth | −8 × 0.12 = −0.96 → −8 × 0.03 = −0.24 (+0.72) |
| Growth | 6.4 − 0.24 − 0.3 (import bill) + 0.1 (fiscal) ≈ 6.0 |
| Unemployment | 7.4 − 0.4 × (6.0 − 5.8) − 0.2 (industry jobs) ≈ 7.1 |
| Why chain for Industry +2 | Russia treaty → energy supply 88% → 97% → shortage penalty removed → factory output → Industry +2 |

The numbers in GAME-DESIGN §2 come from this example. Tuning will change them; the chain will stay.
