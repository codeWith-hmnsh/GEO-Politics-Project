# Statecraft 4.0 — Game Design

| Field | Value |
|---|---|
| Version | 4.0 (final, 2026-10-11) |
| Date | 2026-10-11 |
| Related | [README](README.md) · [SYSTEMS](SYSTEMS.md) · [ACTIONS](ACTIONS.md) · [UI-DESIGN](UI-DESIGN.md) · [MULTIPLAYER](MULTIPLAYER.md) |

All numbers here are **starting values for tuning**. They live in one file, `lib/game/engine/rules.ts`, so playtests and bot self-play can change them without code edits.

---

## 1. Design pillars

1. **You are the leader, not the accountant.** Every screen asks a leader's question: where does the money go, what do we build, who do we deal with. The engine does the arithmetic.
2. **Everything is connected.** Money, people, goods and trust are linked systems. One decision moves several numbers, and the Why chain shows how.
3. **Nothing is free.** Every move costs money, Political Capital, trust or time. Every gain has a trade-off.
4. **Scarcity forces diplomacy.** No country has enough of all three goods (energy, food, tech). Nobody can fund everything.
5. **Every seat can win.** The winner is the leader who improved their own country most, not the biggest country.
6. **The world answers back.** Six leaders act at the same time, so the same move gives different results in different worlds.
7. **Means, not the game.** Sliders, projects and cards are tools. The game is countries competing, negotiating and reacting in a shared world.

## 2. One match, walked through

You are **India**. The other five seats are bots (in multiplayer some are humans). The scenario this match is **Energy Shock**.

**Briefing, 2026.** The globe turns to the Gulf. "Oil supply is tight. The world oil price is up 18%." Your advisors speak:
- Finance: "Our import bill rises by $21B this year. Keep the budget tight."
- Foreign: "Russia has spare oil. Saudi Arabia wants long-term buyers."
- Industry: "Factories slow down when diesel is short. Jobs are at risk."

**Your turn (90 s).**
- *Budget:* you move $8B from Defence to Energy. The forecast shows "Energy security +4 next year".
- *Projects:* you start a **Strategic Oil Reserve** ($8B, 1 turn).
- *Actions:* the top cards are Secure Oil Imports, Expand Refinery, Fuel Subsidy, Energy Partnership, Invest in Solar and Propose Deal. You play **Propose Deal → Russia**: Russia gives 4 units of oil per turn for 3 turns at a 10% discount; India gives $12B of infrastructure investment.
- Russia's bot answers in two seconds with a **Counter**: "5 turns, and $15B." You accept. A treaty is created.
- You press **Lock**.

**The others lock too.** USA: *Sanction Russian energy*. China: *Energy Partnership → Saudi Arabia*. Saudi Arabia: *Raise output*. Japan: *Build nuclear plant*.

**Resolution (about 15 s, skippable).** All six moves are revealed together. On the globe a tanker line draws from Russia to India. A red sanction arc goes from the USA to Russia. A gold line links Saudi Arabia and China. Then your numbers count up:

```
Energy security   62 → 71  ▲ 9
Industry          68 → 70  ▲ 2
Unemployment     7.4 → 7.1 ▼ 0.3
Treasury        $118B → $96B ▼ 22
Russia relations  50 → 58  ▲ 8
USA relations     55 → 51  ▼ 4
Power rank        #4 → #4
```

You tap **Industry ▲ 2 → Why?**

```
Russia oil treaty (+5 units)          ← your move
  → India energy supply 88% → 97%
    → fuel shortage penalty removed (−3 → 0)
      → factory output +2.4%
        → Industry ▲ 2
US sanctions on Russia                 ← USA's move
  → 1 of 5 units delayed (sanctions leakage 80%)
```

**World News.** "India and Russia sign five-year oil pact." "Washington widens sanctions on Russian energy." "Saudi output rises; oil price falls 6%."

**2027.** The world is different now. The oil price is lower. Russia earns more, but its trade with the USA is shrinking. Your reserve is full. Your cards change: *Renegotiate Supply*, *Expand Refinery*, *Export Refined Fuel*. A new problem appears: the USA offers you a tech deal if you reduce Russian oil imports. Now you must choose.

**2037, match end.** India's Power rank went from #4 to #2. Your Leader Score is 684, the highest at the table, so you win. *Your World History* lists the turning points. Your share card says: "India 2026–2037. Built Asia's largest energy alliance. Power rank #4 → #2."

The oil story is one example. Another match can be a **Food Crisis** (a drought in China, India's grain becomes a bargaining chip) or a **Trade War** (US tariffs on China, and Japan has to choose a side). See §10.

## 3. The world

### 3.1 Seats

| Seat | Strong in | Weak in | Main mission (public) | Difficulty |
|---|---|---|---|---|
| 🇮🇳 India | Growth, young workforce, food | Oil imports (~85%), jobs for a growing workforce | Jobs for a young country: unemployment below 2.5% and skills 75+ | Medium |
| 🇨🇳 China | Industry, tech production, reserves | Energy and food imports, ageing workforce | Energy independence: self-sufficiency from 80% to 100% | Medium |
| 🇺🇸 USA | Tech, energy, money, military | Debt, stability swings | Stay #1 in Power and cut debt below 110% of GDP | Medium (high expectations) |
| 🇷🇺 Russia | Energy, food, military | Sanctions, tech imports, small economy | Beyond oil and gas: grow industry by 15% | Hard |
| 🇸🇦 Saudi Arabia | Oil, cash reserves | Food, tech, jobs outside oil | Diversification: industry +20% with stability 60+ | Medium |
| 🇯🇵 Japan | Tech, money, skills | Energy and food imports, ageing, debt | Energy security: self-sufficiency from 12% to 50% | Hard |

Missions show the country's real strategic problem. They teach why each country acts the way it does.

**World Market** is the trading pool of the rest of the world, split into 8 partner regions (§3.4). It buys and sells goods at the world price with limited capacity. It is not a player and it has no seat.

### 3.2 Starting values (rounded, from real data)

Values are seeded from `data/live/indicators.json`, `energy.json`, `crude.json`, `trade.json` and `data/curated/capability.json`, then rounded and frozen per season in `data/game/seed-<season>.json`. The table shows the order of magnitude. The seed script sets the exact values.

| | India | China | USA | Russia | Saudi | Japan |
|---|---|---|---|---|---|---|
| GDP ($T) | 4.2 | 19.4 | 30.5 | 2.1 | 1.1 | 4.2 |
| Growth (%) | 6.4 | 4.5 | 2.0 | 1.0 | 3.5 | 0.6 |
| Population (M) | 1,460 | 1,410 | 340 | 144 | 34 | 123 |
| Unemployment (%) | 7.4 | 5.2 | 4.2 | 2.5 | 3.5 | 2.5 |
| Debt (% GDP) | 82 | 90 | 122 | 20 | 28 | 235 |
| Energy self-sufficiency (%) | 60 | 80 | 105 | 190 | 300 | 12 |
| Food self-sufficiency (%) | 108 | 92 | 125 | 120 | 30 | 38 |
| Tech self-sufficiency (%) | 45 | 95 | 110 | 35 | 15 | 120 |
| Military (0–100) | 62 | 85 | 100 | 80 | 45 | 50 |

### 3.3 Global state

| Variable | Range | Meaning |
|---|---|---|
| `price.energy / food / tech` | index, 100 = start | World prices from total supply and demand (see [SYSTEMS §5](SYSTEMS.md#5-goods-trade-and-prices)) |
| `tension` | 0–100 | World danger. Hostile cards raise it. Treaties lower it. At 70+, growth −0.5 for everyone (markets panic). |
| `globalGrowth` | % | Moves with prices and tension; adds to every country's growth |
| `scenario`, `seed`, `turn` | — | The crisis deck and deterministic randomness |
| `regions[r].sway[seat]` | 0–100 per seat | Each seat's sway in the 8 partner regions (§3.4); drives the influence map |
| `vote` | — | The World Vote of this turn, if any (§10.2) |

### 3.4 Partner regions

The rest of the world is split into **8 partner regions**. They are not players. They buy, sell, take aid and investment, and they lean toward whoever helps them most. They are where a leader's influence becomes visible on the map.

| Region | Countries (examples) | Needs | Offers |
|---|---|---|---|
| Europe | Germany, France, Italy, Poland | Energy | Tech, money |
| Southeast Asia | Indonesia, Vietnam, Thailand, Philippines | Energy, tech | Food, manufacturing jobs |
| South Asia | Pakistan, Bangladesh, Sri Lanka, Nepal | Energy, food, investment | Workforce, markets |
| Middle East & North Africa | UAE, Iran, Egypt, Iraq | Food, tech | Energy |
| Sub-Saharan Africa | Nigeria, Kenya, Ethiopia, South Africa | Investment, food, energy | Minerals, markets |
| Latin America | Brazil, Mexico, Argentina, Chile | Tech, investment | Food, energy |
| Central Asia | Kazakhstan, Uzbekistan, Turkmenistan | Investment, tech | Energy |
| Oceania | Australia, New Zealand | Tech | Food, energy |

- Each region has a **sway** value per seat (0–100, total ≤ 100). Trade deals, aid and investment raise it. Sanctioning a country the region depends on lowers it.
- The seat with the most sway **leads** the region (minimum 25). Leading a region gives +2 influence per turn and −2% on World Market purchases (maximum −8% for four regions).
- **The influence map:** every region you lead is tinted in your seat colour on the globe, stronger as your sway grows. Over a match a leader can watch their colour spread across Africa or Southeast Asia — the satisfying "my colour is spreading" feeling, without conquest.

## 4. Time and the turn

### 4.1 The match clock

- 12 turns. Turn 1 = 2026, turn 12 = 2037.
- Turn timer: **120 s** (turn 1, learning), **105 s** (turn 2), **90 s** (turns 3–12).
- When every human has locked, the turn resolves at once. Bots lock instantly.
- When the timer ends, every unlocked seat **auto-locks** with what it has.
- Resolution replay: about 15 s, skippable with one tap. In multiplayer the next turn starts when every human has skipped or watched it, or after 20 s at most.
- Expected length: 12 × ~110 s ≈ **22 minutes**, plus about 2 minutes for the lobby and the end screen.

### 4.2 The four parts of a turn

| Part | What the player does | If the player does nothing |
|---|---|---|
| **Briefing** | Reads the year's situation, the crisis card (if any) and three advisor lines | — |
| **Budget** | Sets tax and seven ministry sliders | Last year's budget continues |
| **Projects** | Starts a project in a free slot | The slot stays empty; money stays in the treasury |
| **Actions & Diplomacy** | Plays cards and sends proposals with Political Capital | Unused Political Capital: 1 point carries over (maximum 4) |

Every part is optional. A leader can spend the whole turn negotiating with China, or change nothing and save money. **Doing nothing is a strategic choice** and the engine treats it as one (the treasury grows, trust in your steadiness rises a little).

### 4.3 Political Capital (PC)

- 3 PC per turn. Unused PC carries over: maximum +1 per turn, cap 4.
- Cards cost 0–2 PC. A proposal costs 1 PC. Answering a proposal is free.
- Budget changes and projects cost no PC. They cost money.
- PC makes each move a real choice. A leader cannot sanction, subsidise and sign three deals in one year.

## 5. Budget

- **Revenue** = GDP × tax rate. The tax slider runs from 10% to 35% of GDP. Each country starts near its real level.
- **Seven ministries:** Industry & Jobs, Infrastructure, Agriculture, Energy, Education & Skills, Health & Welfare, Defence.
- Money is shown in **$B** so it feels real. Every rule works in **% of GDP**, so a small country is not weaker in the rules.
- Each ministry starts at its real spend. Spending above that pushes its index up. Spending below lets it fall. Effects have lag and diminishing returns ([SYSTEMS §3](SYSTEMS.md#3-budget-and-money)).
- Money not allocated stays in the treasury as a reserve.
- If the treasury goes below zero, the country borrows automatically. Debt rises, the credit rating can fall, and interest costs rise.
- Live forecast: while the player moves a slider, the panel shows the expected change next year ("Unemployment −0.2", "Inflation +0.3"). The forecast uses the same engine, with no knowledge of other players' moves.

| Ministry | Moves | Trade-off |
|---|---|---|
| Industry & Jobs | Industry, jobs | Inflation if far above baseline |
| Infrastructure | Infrastructure, trade capacity, growth | Slow (2–3 turn lag) |
| Agriculture | Food production | Small growth effect |
| Energy | Energy production, renewables | Slow; large money needs |
| Education & Skills | Skills, productivity (3-turn lag) | The long game: no effect for 3 turns |
| Health & Welfare | Health, stability now | Debt; inflation above 1.5× baseline |
| Defence | Military index, security | Money taken from development; stability ± with tension |

## 6. Projects (strategic capabilities)

A project is a one-off build that unlocks a capability. It is **not** a building simulator.

- **Slots:** 1 at the start. A 2nd slot unlocks when GDP has grown 10% from the start. A 3rd unlocks at +25%. Growth itself pays off.
- **Cost:** % of GDP, paid in equal parts over the build turns. A treasury shortfall pauses the project; it does not cancel it.
- **Completion:** a visible moment. The globe pulses at the site, a gold "Completed" stamp appears and the capability is added to the country card.
- No workers, no upgrade levels, no real-time timers, no speed-ups for money.

| Project | Cost (% GDP) | Turns | Capability |
|---|---|---|---|
| Strategic Oil Reserve | 0.2 | 1 | Energy reserve +2 turns of shortfall |
| Refinery Expansion | 0.4 | 2 | Energy production +5% (at least 2.5% of demand) |
| Solar & Wind Programme | 0.6 | 2 | Energy production +4% (at least 2% of demand), demand −2% |
| Nuclear Power Plant | 1.2 | 4 | Energy production +10% (at least 6% of demand) |
| Gas Pipeline (needs a treaty partner) | 0.5 | 3 | Trade capacity for energy with that partner +5 units |
| Port & Shipping Hub | 0.5 | 2 | Trade capacity +20% |
| Highways & Rail Corridor | 0.8 | 3 | Infrastructure +10, growth +0.3 |
| Irrigation & Grain Storage | 0.3 | 2 | Food production +6%, food reserve +2 |
| Semiconductor Fab | 1.0 | 4 | Tech production +12% |
| Industrial Corridor | 0.6 | 3 | Industry +8, jobs +0.6% of workforce |
| National Universities | 0.5 | 3 | Skills +8 (adds to growth after completion) |
| Hospitals Programme | 0.4 | 2 | Health +8, stability +3 |
| Financial Centre | 0.3 | 2 | Borrowing cost −1 point, investment deals +10% value |
| Skills & Apprenticeships | 0.2 | 1 | Unemployment −0.4, skills +3 |
| Naval Base | 0.4 | 2 | Military +5, shipping lane security for own trade |
| Air Defence Network | 0.5 | 2 | Military +6, security +5 |

## 7. Cards and actions (summary)

Full library and rules: [ACTIONS.md](ACTIONS.md).

- The library holds every action the game knows. v1 has 33 cards in six groups: Economy, Trade, Energy, Food, People, Diplomacy.
- Each turn the game shows the **5–7 cards that matter now**, chosen from your country's situation, the scenario and last year's events. Example: in an energy shortage the energy cards come first.
- **"Propose deal"** and the **budget** are always available.
- The **All actions** drawer lists every card, grouped. Cards you cannot play show a lock and the reason ("Needs Port", "Not enough PC"). The player never feels that a move is hidden from them.
- A card shows its cost (PC, $B), its target and a short forecast before the player confirms.

## 8. Diplomacy

### 8.1 Proposals

A proposal is a card with three fields:

```
┌ PROPOSAL · India → Russia ───────────────────────┐
│ India gives    $12B infrastructure investment    │
│ India wants    4 oil units / turn at −10% price  │
│ Duration       3 turns                           │
│                 [Send · 1 PC]                    │
└──────────────────────────────────────────────────┘
```

**Terms that can be given or asked for:**
- Goods supply: units per turn of energy, food or tech, with a price discount or premium.
- Money: a grant, a loan (rate and turns) or an investment (which raises the receiver's infrastructure or industry).
- Tariff cut: lower tariffs between the two countries.
- Pledge: "I will not sanction you", "I will join your sanction on X", "I will not buy from X".
- Alliance: a security guarantee (in the MVP it adds to Security and deters threats).

### 8.2 Answers

- **Accept**, **Reject** or **Counter** (change any field once). A counter can be accepted or rejected, not countered again. This keeps a negotiation inside one turn.
- Bots answer within 1–2 seconds using their utility score ([§15](#15-bots)).
- In multiplayer, a human has until the lock to answer. An unanswered proposal expires and the PC is refunded.
- Accepted proposals become **treaties**. They resolve before other actions in the turn, so promised help arrives first.

### 8.3 Trust and broken promises

- Each pair of countries has **relations** (−100 to 100) and **trust** (0 to 100).
- Keeping a treaty to the end: trust +5, influence +1.
- Breaking a treaty (cancel card or a pledge broken by your own action): trust with that partner −30, with everyone else −8, influence −5. The news reports it.
- Trust changes how bots price your offers and is shown to humans on the World Table.

### 8.4 The World Table

A permanent panel lists every active treaty, sanction and tariff in the world, with the countries, the terms and the turns left. It also lists who leads each partner region. Diplomacy is a visible system, not a hidden message thread.

### 8.5 Trends

Every country card, the World Table and your own result sheet show a small **trend chip** for each Power dimension: **Improving**, **Worsening** or **Unchanging** (the slope over the last 3 turns). A leader can read the world's direction at a glance, not only its numbers.

## 9. Trade, sanctions and tariffs (summary)

Formulas: [SYSTEMS §5](SYSTEMS.md#5-goods-trade-and-prices).

- Each country produces and needs energy, food and tech. Shortfalls are first covered by treaties, then by the World Market at the world price.
- Exporters earn revenue. Importers pay an import bill from GDP and the treasury. A high oil price hurts India and Japan and helps Saudi Arabia and Russia.
- **Tariff** on a country: protects your industry (jobs +) but raises your prices (inflation +). The target loses export income. The target can retaliate.
- **Sanction** on a country: blocks part of its trade with you and adds friction to its trade with others. Strength grows with the GDP share of the sanctioning countries. Leakage is real: a sanctioned exporter can sell to third countries at a discount. Players learn why sanctions rarely stop trade fully.
- **Embargo** of one good: stops your exports of that good to the target.

## 10. Crises and scenarios

Each match draws one **scenario**. The scenario sets the starting situation and weights the event deck. A world event happens on turns 2, 4, 6, 8 and 10 (seeded, so a match can be replayed exactly).

| Scenario | Start | Typical events |
|---|---|---|
| Energy Shock | Oil price +18%, Gulf tension | Tanker attack in Hormuz, pipeline sabotage, OPEC+ cut, mild winter |
| Food Crisis | Food price +15% | Monsoon failure, drought in a grain belt, locust swarm, export ban |
| Trade War | US–China tariffs active | Chip export controls, port strike, currency shock, supply-chain move |
| Calm Start | Prices at 100 | One event from each deck, lower intensity |

v1 has 16 events. Each event is a data entry: trigger weight, affected countries, effects on state, a briefing card and a news template.

**Crisis cards.** When an event hits a country hard, that country's next briefing includes a **crisis card** with 2–3 choices and advisor lines (for example: "Monsoon failed. A) Release grain reserves. B) Ban rice exports. C) Import from Russia."). Choosing is free (no PC). Ignoring it picks the "wait" option. Crisis cards are the Reigns-style fast decisions that give the leader feeling.

### 10.1 Early warnings

Big problems build up; they never appear from nowhere. When the engine's forecast shows a threshold will be crossed next turn, the briefing shows a **warning** one turn early, with the cards that can help:

| Warning | Trigger (forecast for next turn) | Suggested cards |
|---|---|---|
| Protests growing | Stability < 35 | Cash Transfers, Jobs Guarantee, Fuel Subsidy |
| Debt alarm | Rating will drop a step | Austerity Drive, IMF Programme |
| Shortage ahead | Energy or food supply < 90% | Secure Imports, Release Reserves, Propose Deal |
| Jobs crisis | Unemployment +1 point or more | Jobs Guarantee, Special Economic Zone |
| Prices rising | Inflation > 8% | Austerity Drive, Cut Tariffs |

At most two warnings show at once (the most severe first), so the briefing stays calm.

### 10.2 World Vote

On turns **3, 6 and 9** the world votes on one resolution, like a UN session. It is the one moment where all six leaders act on the same question.

- The resolution is drawn from a deck weighted by the current world: *Oil price cap*, *Global sanctions on [country]*, *Clean energy fund*, *Ban on food export bans*, *Tech export rules*, *Shipping lane security mission*, *Debt relief for Africa*.
- Each seat votes **Yes**, **No** or **Abstain** at the top of the Brief step. Voting costs no PC. Bots vote by utility.
- Votes stay hidden until the reveal, then show together.
- A resolution passes with **4 or more Yes** votes. Its effects apply from the next turn for 3 turns (for example: an oil price cap holds the energy price at ≤ 115; global sanctions add +0.5 to sanction strength).
- Voting together: relations +4 between seats that voted the same way; −3 between seats that voted Yes and No. A partner region whose interests a resolution serves gives +5 sway to the Yes voters.

## 11. Military (MVP)

- One **Military** index (0–100), moved by Defence spending and military projects, with slow decay.
- It is used for: the Security dimension of the Power Index; deterrence (a *Pressure* card works only against a country with lower Military, adjusted by alliances); protecting your own shipping when a lane is disrupted (Naval Base).
- No strikes, blockades or war in the MVP. Full conflict comes in S8 and reuses the 2.0 conflict design ([2.0 GAME-DESIGN §8](../docs2.0/GAME-DESIGN.md#8-conflict)).
- High Defence spending raises tension a little and takes money from development. This is the "guns vs butter" trade-off.

## 12. Ranking and winning

### 12.1 World Power Index (live, absolute)

Shown after every turn as a ranked list. Each dimension is scored 0–100 against the six countries in the match.

| Dimension | Weight | Built from |
|---|---|---|
| Economy | 25% | GDP (log scale), growth |
| Development | 20% | GDP per person growth, employment, skills, health |
| Security | 20% | Military, energy security, food security |
| Diplomacy | 20% | Influence, active treaties, average relations, trust |
| Stability | 15% | Stability, inflation, debt sustainability |

The USA usually starts at #1. Population is **potential and responsibility**, never power by itself: a large population raises the needs for food, energy and jobs as much as it raises the workforce.

### 12.2 Leader Score (who wins)

- 0–1000. **500 = held steady.** Score measures how much you improved your own country.
- `score = 500 + improvement (±300) + mission (0–120) + rank climb (+40 per Power rank gained, −20 per rank lost) + objectives (0–60) + difficulty adjustment`.
- **Par:** when a match is created, the engine also plays it once with every leader doing nothing. Improvement and rank climb are measured against that par line, at the same turn — "how much better did you do than a caretaker would have?" This removes the built-in advantage of fast-growing countries.
- Improvement averages your gain over par in each Power dimension, with diminishing returns (`10 × ln(1 + gain / 10)` per dimension), so one runaway number cannot carry a match.
- **Difficulty adjustment** (shown in the score breakdown): a fixed number of points per seat, tuned by bot self-play so every seat wins 12–22% of Normal bot matches. Current values in `rules.ts`: China 0, India −8, Japan +72, Russia +78, Saudi Arabia +68, USA +66.
- **The winner has the highest Leader Score.** Reaching Power **#1** gives the "Rank 1" title on the share card, whoever wins.
- Ties: higher final Power rank wins; then fewer broken treaties.

This keeps the owner's goal — "take my country to Rank 1" — as the visible ambition, while India, Saudi Arabia or Japan can still win the match against the USA.

### 12.3 Objectives

Each scenario adds two optional objectives per country (for example "Energy security above 80 by 2032"). They give mid-match goals and up to +30 each.

## 13. The end of a match

1. **Final ranking:** the Power Index reorders one last time. Then Leader Scores count up and the winner is crowned.
2. **Your World History:** a timeline built only from the match's event log. Turn by turn: the biggest event, your key move, and the turning point ("2029: the USA–Russia sanctions cut India's oil by 20%").
3. **Share card:** an image (Next.js OG image route) with the leader's name and portrait, country, years, the three biggest gains, the Power rank change, the regions led and one achievement line. Shareable link with a public read-only history page.
4. **Rematch** (same players, new seed) and **New match**.

## 14. Advisors and learning

Players learn geopolitics by playing it, not by reading lectures.

- **Three advisors** (Finance, Foreign Affairs, Industry & People) give one line each per turn, built from the state ("Our import bill is 3.1% of GDP"). They never give the "right answer"; they give two sides.
- **Real World notes:** after some decisions, one line links the move to real history ("1991: India's balance-of-payments crisis led to reforms like this"). One line, never a wall of text. Curated in `data/game/real-world.json`.
- **Term chips:** concepts in briefings and Why chains (current account, sanctions leakage, Okun's law, energy security) link to the 1.0 glossary at `/glossary`.
- **The Why chain** is the main teacher: cause and effect, shown on every stat change.

## 15. Bots

- **Utility AI:** each bot scores every legal card, budget change, project and proposal with its country's goals and picks the best set within its PC and money. It uses the same engine forecast as the player's preview.
- **Personalities** (weights on goals):

| Bot | Personality |
|---|---|
| India | Growth and jobs first, buys from anyone, avoids blocs |
| China | Secure supply chains, long contracts, industrial growth |
| USA | Keep #1, use sanctions and tech deals, alliance builder |
| Russia | Sell energy, resist sanctions, find new buyers |
| Saudi Arabia | Maximise oil revenue, diversify, stay neutral |
| Japan | Energy and food security, tech exports, cautious |

- **Difficulty:** Easy (40% random choice among the top 5), Normal (best of the top 3), Hard (best choice, plans 2 turns ahead with the forecast).
- **Answering proposals:** accept if the treaty's forecast value for the bot ≥ 0 and trust ≥ 30; counter if the value is between −15% and 0 (asks for a better price or a longer term); otherwise reject.
- The same bots play **caretaker** for humans who disconnect.

## 16. Balance method

- **Headless self-play:** a CLI runs 10,000 bot-only matches per rules change and reports win rate per country, score spread, average debt and stability, and dominant strategies.
- **Targets:** every country wins 12–22% of bot matches at Normal; no single card appears in more than 60% of winning turns; average match has at least 4 treaties.
- **Playtests:** each build step has a fun gate ([BUILD-PLAN](BUILD-PLAN.md)).

## 17. Leader identity

In the lobby each player sets a **leader name** (up to 20 characters, filtered) and picks one of 8 illustrated **portrait styles** (no real faces). The countries stay real; only the leader is yours. The name and portrait show on the ranking rail, in proposals, in the news ("President Asha Rao signs oil pact") and on the share card.

## 18. Not in the MVP

War and strikes, intelligence, more than 6 countries, coalition mode (3 v 3), async seasons, ranked rating, Daily Crisis, free text, elections, migration and ageing as separate systems, chat. Deferred by the owner on 2026-10-11: the history scrubber (a year slider replaying the globe at match end) and player-made custom scenarios. Each has a later step in [BUILD-PLAN](BUILD-PLAN.md).
