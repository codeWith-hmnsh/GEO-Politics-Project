# Geo-Politics 4.0 — Statecraft: Final Game Plan

**Status: final plan for review (2026-10-11).** No code is written from this folder until the owner says "start building". The first build step is [BUILD-PLAN.md §S1](BUILD-PLAN.md#s1--engine-core-no-ui).

> **One line:** *You lead a country. You get a budget, a few strategic moves and a world that answers back. Take your country to Rank 1.*

Statecraft is a multiplayer geopolitical strategy game built on the Geo-Politics 1.0 globe. Each player leads one real country. Every turn is one year. The player spends a national budget, starts projects, plays a few strategic cards and makes deals. All six countries lock their moves, and a deterministic engine resolves them together. The globe shows what changed. The **Why chain** shows how it happened, and the news shows what the world saw. A match is 12 turns and takes 20–25 minutes.

It is not a quiz, not a Clash of Clans clone and not a menu of fixed choices. It is a small living world that you and five other leaders change together.

## Read in this order

| # | Doc | What it answers |
|---|---|---|
| 1 | [GAME-DESIGN.md](GAME-DESIGN.md) | The full game: one match walked through turn by turn, the world, countries, turn flow, budget, projects, cards, diplomacy, crises, ranking, the end of a match, bots, learning. |
| 2 | [SYSTEMS.md](SYSTEMS.md) | The simulation model: every variable, every formula, the order of resolution, cause chains, determinism, and a worked example with numbers. |
| 3 | [ACTIONS.md](ACTIONS.md) | The card library (v1: 32 cards), how 5–7 cards are chosen each turn, the "All actions" drawer, and the free-text order bar that comes later. |
| 4 | [UI-DESIGN.md](UI-DESIGN.md) | How it looks, moves and feels: the scrollable Play page, every match screen with wireframes, the motion system, game feel rules, component sources (Motion, React Bits, 21st.dev, Magic UI), mobile, accessibility, performance. |
| 5 | [MULTIPLAYER.md](MULTIPLAYER.md) | Solo, Quick Match and private rooms; matchmaking; country assignment; bots filling seats; leavers; the server-authoritative round loop; data model; free-tier limits and cost. |
| 6 | [ENGAGEMENT.md](ENGAGEMENT.md) | Why a player comes back: the loops inside a turn, a match, a day and a season; progression; sharing; guard rails. |
| 7 | [BUILD-PLAN.md](BUILD-PLAN.md) | Steps S1–S8 with tasks, playtest gates and done criteria. |
| 8 | [RESEARCH.md](RESEARCH.md) | Competitors (Dummynation, WorldOS, NationFall, Country Simulator, Eversim), the market gap, a review of our 1.0 app, and proposed additions R-1 to R-9 that need approval. |

## How this plan was reached

The owner rejected two things in the earlier plans:

1. **Free text as the main input** (3.0). Without a paid language model, a rule parser fails often, and a player who sees "I did not understand" leaves. Typing is also slow on mobile.
2. **No feeling of building your own country.** The earlier loops were abstract. The owner wanted the "I built this and my numbers went up" feeling of Clash of Clans, without its grind.

Research on reference games gave the parts used here:

| Reference | What Statecraft takes | What it avoids |
|---|---|---|
| Democracy 4 | Budget and policy effects that spread through linked variables; the "flowchart" that becomes our Why chain | A wall of 100 policy icons |
| Clash of Clans | Projects that finish with a visible payoff | Workers, upgrade levels, real-time timers, grinding |
| Supremacy 1914 / Conflict of Nations | Free browser play, diplomacy and coalitions, a session that fits a busy day | Matches that last weeks |
| Diplomacy (board game) | Simultaneous locked orders; deals and broken promises | Hours-long sessions |
| Reigns | Crisis cards with two or three choices, fast on mobile | Random outcomes with no system behind them |
| Wordle | One shared daily puzzle with a shareable result (later step) | — |
| NationStates | A warning: "answer an issue" alone becomes repetitive | Event-only gameplay |

## The final design in ten lines

1. **6 countries:** India, China, USA, Russia, Saudi Arabia, Japan. Bots hold every seat without a human.
2. **12 turns, 1 turn = 1 year** (2026 → 2037). Turn timer 120 s, 105 s, then 90 s. When everybody locks, the turn resolves at once.
3. **Each turn has four optional parts:** Budget, Projects, Actions (cards) and Diplomacy. Every part is optional. Doing nothing is a valid strategy.
4. **Budget:** revenue = GDP × tax. Seven ministry sliders. The previous budget carries over.
5. **Projects:** strategic capabilities (refinery, port, chip fab, university), built over 1–5 turns. No workers, no levels, no grind.
6. **Cards:** a large library. Each turn shows the 5–7 cards that matter now, plus an "All actions" drawer that is always open to the player.
7. **Political Capital:** 3 points per turn pay for cards and proposals. One unused point carries over (maximum 4).
8. **Systems:** economy, population and employment, energy, food, tech, trade, diplomacy, stability. Military is a single index in the MVP and becomes full conflict later.
9. **World Power Index** shows the live ranking. The match winner has the highest **Leader Score**: improvement from your own start, plus your mission, plus a bonus for each Power rank you climb.
10. **After each turn:** globe replay, Why chain, World News. **After the match:** Your World History and a share card.

## What is kept from 2.0 and 3.0

- The server-authoritative, deterministic TypeScript engine in `lib/game/engine/`, with a seeded RNG and a cause record on every stat change ([2.0 ARCHITECTURE §4](../docs2.0/ARCHITECTURE.md#4-engine-package)).
- Seeding from real 1.0 data (`data/live`, `data/curated`), with values frozen per season.
- Leader Score with 500 = held steady (2.0).
- Proposal cards with gives / wants / duration and Accept, Reject, Counter (3.0 DIPLOMACY).
- The order card idea from 3.0: free text, when it arrives, only fills in a card. The engine executes cards, never raw text.
- Entry flow D-9: Start, Create room, Join with code. Bots hold free countries.
- The 1.0 look: paper theme, white glass cards, Manrope and Fraunces, the satellite globe, tokens in `app/globals.css`.
- Monetization stance D-1: never sell power in ranked play.

## What changes

| Area | 2.0 | 3.0 | 4.0 (this plan) |
|---|---|---|---|
| Main input | Dock of action drawers | Free-text order bar | Budget + projects + 5–7 contextual cards + "All actions" drawer |
| Free text | — | Required, LLM interpreter | Later (S7), optional, keyword parser that only fills a card; no LLM needed |
| Countries | 10 | 4 | **6** (adds Saudi Arabia as an oil seller and Japan as an import-dependent tech power) |
| Turn | 1 quarter, 12 rounds | 8 rounds | **1 year, 12 turns, 20–25 min** |
| Goods | 4 | Oil, grain | **Energy, food, tech** |
| People | Approval, stability | — | **Population, workforce, employment, skills** as core systems |
| Military | Full war model | Not in slice | Single index in MVP; conflict in S8 |
| Ranking | Leader Score only | Leader Score | **World Power Index (live) + Leader Score (winner)** |
| First build | 10-seat sandbox | 4-country multiplayer slice | **Solo vs 5 bots, client-only, before any multiplayer** |
| AI cost | Optional narrator | Interpreter ≈ $0.03 per match | **$0** (rules, utility bots, templates) |

The untracked draft files `docs/GAME-PLAN.md`, `lib/game/types.ts` and `supabase/game_tables.sql` are still untouched. S1 replaces `lib/game/types.ts`.

## Decisions needed

| # | Question | Recommendation |
|---|---|---|
| F-1 | Six countries | India, China, USA, Russia, Saudi Arabia, Japan. |
| F-2 | Time scale | 1 turn = 1 year, 2026 to 2037, 12 turns. |
| F-3 | Who wins a match | Highest Leader Score. The Power Index decides the "Rank 1" title and a rank-climb bonus, not the winner. |
| F-4 | First build | Solo vs bots, with the engine running in the browser and no backend (S3). Multiplayer starts at S5. |
| F-5 | Sound | On by default at low volume, one-tap mute, choice remembered. Free CC0 sounds. |
| F-6 | Login | Guests play without login (Supabase anonymous auth from S5). Login is needed only to keep progress across devices. |
| F-7 | Military in MVP | Single Military index used for deterrence and security. No war until S8. |
| D-1 | Monetization (open since 2.0) | Unchanged: depth, comfort and style only. Never sell power in ranked play. |
