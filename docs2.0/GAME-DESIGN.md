# Statecraft — Game Design

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Related | [PRD.md](PRD.md) · [UI-DESIGN.md](UI-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) |

All numbers in this document are **starting values for tuning**, not final balance. They live in one config file (`lib/game/engine/rules.ts`) so playtests and bot self-play can change them without code edits.

---

## 1. Design pillars

1. **Everything is connected.** Money, goods, trust and force are four systems that touch each other. One decision moves several of them.
2. **Nothing is free.** Every action has a cost to the actor, not only to the target.
3. **Scarcity forces diplomacy.** No country is self-sufficient in all four goods; nobody can afford everything.
4. **Improve your own country.** Score measures improvement from your own start, so every seat can win.
5. **Show the cause.** The engine records why every number changed.

## 2. The world

### 2.1 Seats (MVP, D-4)

| Seat | Strong in | Weak in | Nuclear | Difficulty |
|---|---|---|---|---|
| 🇺🇸 USA | Tech, energy, military, money | Debt, approval swings | Yes | Medium (big expectations) |
| 🇨🇳 China | Minerals, manufacturing (tech), reserves | Food and energy imports, ageing | Yes | Medium |
| 🇮🇳 India | Growth, food, people | Oil imports (~85 %), defense imports | Yes | Medium |
| 🇷🇺 Russia | Energy, food, arms, minerals | Sanctions, tech imports, small economy | Yes | Hard |
| 🇵🇰 Pakistan | Location, army size | Debt, energy imports, inflation | Yes | Hard |
| 🇸🇦 Saudi Arabia | Oil, cash reserves | Food, tech, arms imports | No | Easy–Medium |
| 🇩🇪 Germany | Tech, money, reputation | Energy imports, small military | No | Medium |
| 🇯🇵 Japan | Tech, money | Energy, food, minerals imports, debt | No | Hard |
| 🇧🇷 Brazil | Food, minerals, energy | Infrastructure, inflation | No | Easy |
| 🇬🇧 UK | Money, reputation, military reach | Food and energy imports | Yes | Medium |

The rest of the world is one actor: **World Market** (buys and sells goods at the world price, with limited capacity). It is not a player.

### 2.2 Time
- 1 round = 1 quarter. 12 rounds = 3 years = **one term**. Elections at rounds 6 and 12.
- Game year starts at the current real quarter (e.g. "Q4 2026").

### 2.3 Global state
| Variable | Range | Meaning |
|---|---|---|
| `tension` | 0–100 | World danger. Rises with hostile acts, falls 3 per round naturally and with peace deals. ≥ 75 "Brink" (markets panic: growth −0.5 for all). 100 = catastrophe, match ends. |
| `price.energy / food / tech / minerals` | index, 100 = start | World prices from total supply vs demand. Embargoes and blockades raise them for everyone. |
| `round`, `seed` | — | Deterministic randomness: `rng = mulberry32(hash(matchId, round, actionId))`. |

## 3. Country model

```ts
interface CountryState {
  iso3: string;
  // Economy (real-scale numbers so it feels real)
  gdp: number;            // $B per year
  growth: number;         // % per year
  inflation: number;      // % per year
  unemployment: number;   // %
  debtPct: number;        // % of GDP
  treasury: number;       // $B cash available now
  taxLevel: number;       // 0–100 slider (maps to revenue % of GDP)
  rating: 'AAA'|'AA'|'A'|'BBB'|'BB'|'B'|'CCC'; // derived from debt, growth, stability; sets interest
  budget: Record<Ministry, number>; // % of GDP per year, per ministry

  // People (0–100 indices)
  approval: number; stability: number; health: number; education: number; infrastructure: number;

  // Goods: production and demand in "units", reserve in rounds of demand
  goods: Record<Good, { prod: number; demand: number; reserve: number }>;

  // Force (0–100, seeded from Capability Index ×10)
  force: { land: number; air: number; sea: number; missile: number; airDefense: number; cyber: number };
  readiness: number;      // 0–100, rises when mobilised, decays otherwise
  nuclear: boolean; nuclearAlert: boolean;

  // Standing
  reputation: number;     // 0–100, global view
  // Pair data lives in WorldState.pairs[a][b]: relation (−100..100), trust (0..100),
  // treaties, tariffs, embargoes, sanctions, war { front: 0..100, since }
  projects: ActiveProject[];  // building, rounds left
  flags: string[];            // 'capitulated', 'caretaker', 'removed', …
}
type Ministry = 'health'|'education'|'infrastructure'|'defense'|'welfare'|'research';
type Good = 'energy'|'food'|'tech'|'minerals';
```

### 3.1 Seeding from real data (reuse 1.0)

| Field | Source in repo |
|---|---|
| gdp, growth, inflation, unemployment, debtPct | `data/live/indicators.json` (IMF / World Bank) |
| budget.defense | military spend % GDP (SIPRI via indicators) |
| budget.health / education | World Bank spend % GDP (add to ingest if missing) |
| goods.energy | `data/live/energy.json`, `data/live/crude.json` (production vs consumption) |
| goods.food / tech / minerals | `data/live/trade.json` (Comtrade by HS chapter) + `data/curated/minerals.json` |
| force.* | `data/curated/capability.json` (Air / Land / Sea 0–10 → 0–100; missile, AD, cyber curated) |
| nuclear | `data/curated/nuclear.json` |
| relations, trust | `data/curated/relations.json` (green 40, blue 0, amber −10, red −50) |
| initial trade flows | `data/live/trade.json` top partners among the 10 seats; the rest goes to World Market |
| health, education, infrastructure, approval, stability | normalised from HDI components, LPI, governance indicators; approval starts 55 ± 10 |

All seeded values are rounded and frozen per season into `data/game/seed-<season>.json` so matches in a season are comparable.

## 4. Money: budget, projects and debt

### 4.1 The quarter
```
revenue   = gdp/4 × taxRate(taxLevel)            taxRate: 10 % … 40 % of GDP
spending  = gdp/4 × Σ budget[m] / 100 + projects due + interest + war costs
treasury += revenue − spending + aid received − aid given + trade income
if treasury < 0: auto-borrow → debtPct rises; rating may drop; interest rises
```
Money is shown in $B so it feels real (the USA spends $70B on health per quarter, Pakistan $1B), but **every effect uses % of GDP**, so a small country is not weaker in the rules.

### 4.2 Ministry sliders (continuous)
Each ministry has a **baseline** (the real spend % of GDP at start). Moving above baseline pushes its index up; below pushes it down, with lag and diminishing returns:

```
target(index) = 50 + 25 × log2(spend / baseline)     // clamp 0–100
index += (target − index) × speed                      // speed: health .25, education .12 (slow), infra .15
```

| Ministry | Moves | Side effects |
|---|---|---|
| Health | health | approval +, small growth + after 4 rounds |
| Education | education (slow) | growth + after 4 rounds (the long game) |
| Infrastructure | infrastructure | growth +, energy/food production +2 % per 10 points |
| Defense | readiness, slowly force | approval ± by tension (high tension: people want defense) |
| Welfare & subsidies | approval, stability | inflation + if over 1.5× baseline; debt |
| Research & energy | tech prod, energy prod (renewables) | slow; tech +1 % per round per point above baseline |

### 4.3 Tax and money printing
- `taxLevel` up → revenue up, approval −, growth − (above 60).
- **Print money** (decision): treasury + 2 % of GDP now, inflation +4, rating −1 step. Two in a row → inflation spiral risk.

### 4.4 Projects (one-off decisions — "build 200 hospitals")
Cost is % of GDP, so the button means the same for every country; the $B label is real-scale.

| Project | Cost (% GDP) | Rounds to build | Permanent effect |
|---|---|---|---|
| Hospitals programme | 0.4 | 2 | health +8, approval +3 |
| Schools & universities | 0.5 | 3 | education +8; growth +0.2 after done |
| Highways & rail | 0.8 | 3 | infrastructure +10, growth +0.3 |
| Power plants (gas / solar / nuclear) | 0.6 / 0.7 / 1.2 | 2 / 2 / 5 | energy prod +8 % / +6 % / +15 % |
| Strategic oil reserve | 0.3 | 1 | energy reserve +2 rounds |
| Food reserves & irrigation | 0.3 | 2 | food prod +5 %, reserve +2 |
| Chip fab | 1.0 | 4 | tech prod +12 % |
| Rare-earth mine & refinery | 0.6 | 3 | minerals prod +10 % |
| Tanks & armour | 0.4 | 2 | land +8 |
| Fighter jets | 0.6 | 3 | air +8 |
| Warships | 0.6 | 4 | sea +8 |
| Missile batteries | 0.4 | 2 | missile +8 |
| Air-defence systems | 0.5 | 2 | airDefense +10 |
| Cyber command | 0.2 | 1 | cyber +10 |

Arms projects need tech supply ≥ 80 % or cost +50 % (import dependence), which makes arms trade valuable.

### 4.5 Borrowing
| Source | How | Cost |
|---|---|---|
| Auto-borrow (bonds) | automatic when treasury < 0 | interest by rating (AAA 1 %, BBB 4 %, B 9 %, CCC 15 % per year) |
| IMF programme (decision) | +3 % GDP now | conditions for 4 rounds: welfare and defense capped at baseline, approval −6, reputation +2 |
| Ally loan (offer) | any player can lend $B | terms set in the offer (rate, rounds); default → trust −50 |

"No money for tanks" is a **gameplay moment**, not a store moment: borrow, ask an ally, sell goods, cut something.

## 5. Action space

Each round a player has **3 decisions** (4 if approval ≥ 70, 2 if stability < 30). Budget sliders, answering offers and quick phrases are free.

### 5.1 Domestic
| Decision | Effect |
|---|---|
| Start a project (§4.4) | cost now, effect when done |
| Print money | §4.3 |
| Raise / cut taxes sharply (beyond slider step) | ±revenue now, approval ∓5 |
| Fuel / food subsidy | approval +5, demand +10 % of that good for 2 rounds, cost 0.2 % GDP |
| Rationing | demand −15 %, approval −8, stability −4 |
| Release strategic reserve | +reserve of a good into supply this round |
| Emergency security measures | stability +10, approval −6, reputation −3 |
| Mobilise | readiness +25 (decays 10/round), tension +4 (+8 if at a rival's border), cost 0.1 % GDP/round |

### 5.2 Trade and economy (target = a country)
| Decision | Effect on target | Effect on actor |
|---|---|---|
| Propose trade deal (offer) | both: tariff 0, flow +20 %, relation +10, growth +0.2 | same |
| Impose tariff (10 / 25 / 50 %) | exports to actor −, growth −0.1…−0.5 | revenue +, own prices of that good + (inflation) |
| Embargo a good | loses actor's supply of that good (must buy elsewhere) | loses that export income; relation −25 |
| Sanction (full) | trade with actor 0, growth −0.5…−1.5, rating −1 | own exports −; reputation ± by world view of target; others trading with target get a "secondary sanctions" prompt |
| Buy from World Market | +goods at world price × 1.1 | treasury − |
| Sell surplus to World Market | — | treasury + at world price × 0.9 |
| Offer economic aid / loan (offer) | +$B | −$B; relation + |
| Lift tariff / embargo / sanction | reverses gradually over 2 rounds | relation + |

### 5.3 Diplomacy (offers; recipient answers for free)
| Offer | Terms the sender can set | On accept |
|---|---|---|
| Request help — **military** | arms, air-defence deployment, troops, intelligence | helper pays (see §8.5), target gains |
| Request help — **economic** | $B amount, loan or grant | transfer |
| Request help — **goods** | good, units, price per unit, rounds | supply contract (both see it on the globe as a flow) |
| Trade deal | goods, tariffs, duration | §5.2 |
| Defensive alliance | duration (or permanent) | attack on one triggers call-to-arms for the other; relation +25 |
| Non-aggression pact | rounds | breaking it: reputation −20, trust −60 |
| Ceasefire / peace | reparations, lifted sanctions | war ends; tension −10 |
| Intel sharing | rounds | both see each other's exact force numbers and a third country's queued military orders |
| Joint sanction | target | both apply the sanction with 30 % less self-cost |

Every offer can be **Accepted, Countered** (edit terms and send back) or **Declined**. Declining is free but lowers relation by 5–15 depending on how much the sender needed it (the receiver sees this cost before choosing). Unanswered offers expire after the next round.

Standalone diplomatic decisions: **Denounce** (target reputation −3, relation −15), **Recall ambassador**, **Break alliance / treaty** (reputation −15, trust with that country −60, all other allies' trust −10).

### 5.4 Military
| Decision | Rules |
|---|---|
| Mobilise | §5.1 |
| Strike | choose weapon (missile / air), target country, target type (military base, energy site, infrastructure, city) and a city from the target's list. Resolution §8.2. Starts a war if none. |
| Naval blockade | needs sea ≥ target sea × 0.8; target's seaborne trade −50 %, world prices +; tension +8 |
| Cyber operation | target infrastructure −3 or tech prod −5 % for 2 rounds; 40 % chance attribution (then counts as hostile act) |
| Ground offensive | neighbours only (IND–PAK, IND–CHN, CHN–RUS…; adjacency list in rules). Moves the front meter §8.3 |
| Arms transfer | send force points to an ally or a country at war (from own stock) |
| Deploy air defence abroad | own airDefense −20 for 3 rounds, target +15 |
| Nuclear alert | deterrence +; tension +15; reputation −10. No strike option (D-8). |
| Offer ceasefire / peace | offer (§5.3) |

### 5.5 Intel (P1–P2)
Intel sharing (offer) in MVP. P2: spy (reveal a country's exact numbers for 2 rounds), sabotage (project delay), influence campaign (target approval −3, attribution risk).

## 6. Trade and supply chains

### 6.1 Supply each round
```
supply(g) = prod(g) + Σ contracts in + world market buys − Σ contracts out
ratio(g)  = supply / demand
reserve absorbs shortfall first (−1 round of demand per round used)
```

| ratio | Effect (per round) |
|---|---|
| ≥ 1.0 | normal; surplus sold to World Market automatically (income) |
| 0.85–1.0 | price of good +, inflation +1 |
| 0.6–0.85 | inflation +3, approval −4, growth −0.4; energy shortage also cuts all production −5 % |
| < 0.6 | crisis: inflation +6, approval −8, stability −6, growth −1.0; country status turns **Crisis** |

### 6.2 World Market
- Buys and sells any good, but its capacity per round is limited (e.g. energy 30 units for all players combined). When several players rush to it, its price climbs: `price = base × (1 + 0.8 × (demandOnMarket / capacity)²)`.
- Embargoes and blockades remove supply from the world, so the world price rises **for everyone** — the USA's embargo on India makes oil dearer in Japan too. That is the chain reaction.

### 6.3 Example chain (from the owner's idea)
```
R3  Country A asks China for oil (goods offer)  → China declines (relation −10)
R3  A embargoes grain to China                  → China food ratio 1.05 → 0.88 → inflation +1, food price +
R4  China buys food on World Market (price ↑)    → China treasury −; world food price +6 % → Japan, UK pay more
R4  China asks Russia for grain                  → Russia counters: "yes, at 1.3× price + you lift chip export limits"
R5  China–Russia relation +15, A–China −25        → A's grain exports lost → A's revenue −, A still short of oil
R5  A buys oil from Saudi Arabia (offer)          → USA (Saudi ally) sees it on the globe… 
```

## 7. Approval, stability, elections

```
approval Δ = +welfare effect +health/education trend −inflation over 5 % −unemployment over 7 %
             −shortages −war weariness (−2 per round at war, −4 if losing the front)
             +rally effect (+6 the round you are attacked, decays) −tax above 55 ± events
stability  follows approval with lag; drops with crisis goods, protests, war on home soil
```
- **Elections (rounds 6 and 12):** approval ≥ 50 → +40 score bonus; 25–50 → nothing; < 25 → removed from office. A removed leader's seat becomes a bot ("Caretaker"), their score freezes with −100.
- **Stability < 20:** "Unrest" — one decision slot lost, production −5 %. **< 10:** protests visible on the globe; risk of removal each round (10 %).

## 8. Conflict

### 8.1 War state
A war exists between two countries after a strike, blockade or ground offensive. While at war:
- both: treasury −0.15 % GDP per round, growth −0.8, war weariness on approval;
- trade between them stops; their allies receive a **call to arms** offer;
- country status on the globe: **War** (red).

### 8.2 Strikes
```
salvo    = 4 + floor(attacker.missile or air / 20)          // 4–9 shots
pIntercept = clamp(0.15 + 0.6 × AD / (AD + attackPower), 0.10, 0.85)
hits     ~ Binomial(salvo, 1 − pIntercept)  using the seeded RNG
```
| Target type | Per hit | Extra costs to attacker |
|---|---|---|
| Military base | target force (chosen branch) −3, readiness −5 | tension +6, reputation −4 |
| Energy site | energy prod −4 % for 3 rounds; world energy price + | tension +8, reputation −8 |
| Infrastructure | infrastructure −2, growth −0.2 | tension +8, reputation −8 |
| City | infrastructure −3, stability −4, simulated casualty estimate | tension +12, reputation −20, all relations −10; target gets rally +8 |

Casualties: `estimate = hits × cityDensityFactor × typeMultiplier`, shown as a range ("est. 800–1,400, simulated"). Never shown as a score, never celebrated.

### 8.3 Ground offensive and the front meter
Each war pair has a **front** value 0–100 (50 = no change), shown as a bar between the two flags.
```
push = (atk.land × atk.readiness × supply(atk) − def.land × def.readiness × supply(def) × 1.3) / 400
front += clamp(push, −12, +12)        // positive = attacker gains
losses: both land −1…−4 depending on push; air superiority (air ratio > 1.5) adds +3 push
```
- Front ≥ 85: defender may be forced to accept terms (reparations up to 3 % GDP, sanctions lifted). Front ≥ 95 two rounds in a row: **capitulation** (defender's war ends with heavy score loss; attacker gets reparations and −20 reputation).
- **No border changes on the map.** The front meter and the conflict glow show pressure (1.0 neutrality rules).

### 8.4 Escalation and Tension
| Act | Tension |
|---|---|
| Mobilise / tariff 50 % / denounce | +2…+4 |
| Sanction, embargo | +4 |
| Blockade, cyber (attributed) | +8 |
| Strike | +6…+12 |
| Strike between two nuclear states | ×1.5 |
| Nuclear alert | +15 |
| Peace treaty / ceasefire | −10 / −5 |
| Natural decay | −3 per round |

At **75+ "Brink"** all players see a banner, markets drop (growth −0.5 for all) and the advisor suggests de-escalation. At **100** the match ends: "**No winners.**" Every score × 0.3; the Chronicle runs a black front page. Players can avoid this together — that tension is part of the fun.

### 8.5 Help has a price (the India → Russia example)
| Help given | Cost to helper | Gain for receiver |
|---|---|---|
| Arms transfer | force points from own stock (−1 per +1) | +force immediately |
| Air-defence deployment | own airDefense −20 for 3 rounds | +15 |
| Troops (join the war) | helper enters the war against the attacker | helper's land adds 50 % to the front |
| Intelligence | none, but if the attacker learns of it (30 %): relation −20 | receiver sees attacker's queued military orders next round |
| Economic aid | $B | $B |
| Diplomatic support | joint sanction or denounce | — |

An ally who declines a **call to arms** keeps their resources but loses trust (−40 with the ally) and reputation (−10). Honouring treaties earns score in the Standing dimension.

### 8.6 Nuclear weapons
- Nuclear states (USA, CHN, IND, RUS, PAK, GBR): attacks **against** them add +50 % tension; ground offensives into them cap at front 80 (deterrence).
- "Nuclear alert" is the only nuclear action. There is no nuclear strike button (D-8). The catastrophe end state represents the risk.

## 9. World events (P1)
Every 2 rounds the engine draws one event from a deck, weighted by the week's real news themes (from 1.0's Daily Brief classification: conflict, economy, energy, diplomacy).

| Event | Effect |
|---|---|
| Oil shock (Hormuz tension) | world energy price +25 % for 2 rounds |
| Monsoon failure (South Asia) | IND, PAK food prod −15 % |
| Chip shortage | world tech price +30 %; tech-poor countries' projects +20 % cost |
| Pandemic wave | all health −5, growth −0.5; health ≥ 70 halves it |
| Earthquake (seeded country) | infrastructure −6; aid offers get reputation ×2 |
| Global boom | growth +0.5 for all |
| Election protests (lowest approval country) | stability −10 |

## 10. Scoring

### 10.1 Leader Score (per match, 0–1000)
Five dimensions. Each starts at **100 = your starting position** and moves with improvement (0–200). Total = Σ weight × dimension × 5, so **500 = you held your country steady**.

| Dimension | Weight | Composite (0–100) from |
|---|---|---|
| Prosperity | 25 % | growth, inflation, unemployment, gdp change |
| People | 25 % | health, education, approval |
| Security | 20 % | stability, force intact, front, no capitulation, infrastructure not damaged |
| Standing | 15 % | reputation, alliances, treaties honoured, offers kept |
| Resilience | 15 % | goods ratios, reserves, debtPct, rating |

```
dim = clamp(100 + 4 × (endComposite − startComposite), 0, 200)
LeaderScore = round(5 × Σ weight × dim) + bonuses − penalties
bonuses: election ≥ 50 (+40 each), national goal (+50), secret agenda (+60, P1)
penalties: removed from office (−100), capitulated (−150), catastrophe (total × 0.3)
```
Rank in the match = order by Leader Score. Rank 1 is "best leader", not "biggest army".

### 10.2 Titles (earned by play style; shown on the profile)
| Title | Condition |
|---|---|
| The Peacemaker | Ended a war you were not in, or 2+ peace deals |
| The Builder | 4+ projects finished; health and education +15 |
| The Economist | Growth above start every round; debt down |
| The Diplomat | 3+ accepted offers you sent, 0 broken treaties |
| The Defender | Survived an attack with front ≤ 60 and won the election |
| The Kingmaker | Your help changed a war's outcome |
| The Hawk | Most hostile acts (neutral wording, no glory) |
| The Survivor | Started in the bottom 3 by score potential, finished top 3 |

### 10.3 Leader Rating (ranked, across matches)
- Multiplayer Elo/Glicko-style: each finished ranked match is treated as pairwise results between all human players by final rank. Start 1000; provisional for the first 10 matches.
- Leaving a ranked match early counts as last place.
- Bots do not affect rating.
- **Seasons** (6 weeks): soft reset toward 1000, season badge by peak tier (Envoy → Minister → Statesman → World Leader).

### 10.4 Leaderboards
Global rating · season · **per country** ("Best leaders of China" by best Leader Score) · Daily Crisis (today) · friends. The profile shows the "country dossier" of a player's best match: GDP, growth, debt, health, education, force, alliances — the "Himanshu, leader of China, rank 5" card from the idea.

## 11. Bots

Bots fill empty seats, replace disconnected players, and run balance tests. They are **rule-based utility AI**, not LLMs (fast, free, deterministic).

- Each round a bot scores every legal decision with `utility = Δ(expected LeaderScore over 2 rounds) + personality bias − risk`, using the same engine in forecast mode, and picks the top 3.
- **Personalities:** Builder (projects, peace), Trader (deals, markets), Hawk (force, deterrence), Opportunist (attacks weak, low-trust), Diplomat (alliances, help). Each seat gets a personality fitting its real-world style but randomised per match.
- **Difficulty:** Easy (top-5 random pick, slow reactions), Normal, Hard (looks 3 rounds ahead).
- Bots answer offers by utility and trust; they honour treaties 80–95 % by personality.
- Bot names: "Caretaker government of Brazil" (never fake human names in ranked).

## 12. Balance method
1. Every engine change runs **10,000 bot self-play matches** in CI (seconds per match, headless).
2. Check: per-country average Leader Score within ±10 % of the mean; catastrophe rate < 5 %; median wars per match 1–2; no single decision used in > 30 % of all slots.
3. Live data after launch: per-country win rate, decision usage, abandon points — reviewed each week.

## 13. Advisor and "Why did this change?"
- Every `StatChange` stores `{ field, delta, causeId, label }`, and causes chain (`embargo → energy ratio → inflation → approval`). The UI renders this as a cause chain for any number.
- Advisor (rule-based, 1–3 per round): forecasts the next 2 rounds with no new decisions and flags the biggest risks ("Energy runs out in 2 rounds", "Pakistan mobilised at your border", "Election in 2 rounds: approval 41").

## 14. Simulated news templates (World Wire)
Each event type has 3–5 neutral templates filled from the event:

```
strike.city:    "{Attacker} strikes {city}; {Target} reports damage to infrastructure (simulated)"
embargo.energy: "{Actor} halts energy exports to {Target}; fuel prices expected to rise"
offer.declined: "{Receiver} declines {Sender}'s request for {kind}"
election.won:   "{Country}'s government re-elected with {approval}% approval"
tension.brink:  "World leaders warn of escalation as tensions hit record high"
```
Rules: present tense, no adjectives of judgement ("brutal", "heroic"), always the Simulated tag. Optional LLM rewrite (D-5) receives only these facts and must keep them unchanged.

## 15. Daily Crisis (solo, P1)
- One seeded scenario per day, same for everyone: a country, a starting crisis ("Oil at 140 %, election in 4 rounds") and 9 bots.
- Blitz: 8 rounds. Leaderboard by Leader Score; streak counter; result card shareable ("I steered Japan through the 2026 energy shock: 712").
- One ranked attempt per day; unlimited practice replays (Premium, see MONETIZATION.md).
