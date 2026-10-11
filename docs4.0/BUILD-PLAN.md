# Statecraft 4.0 — Build Plan

| Field | Value |
|---|---|
| Version | 4.0 (final plan for review) |
| Date | 2026-10-11 |
| Related | [README](README.md) · all docs in this folder |

> Build nothing until the owner says "start". Then build one step at a time, commit after each step, and pass each gate before the next step.

This plan replaces the build order in [2.0 BUILD-PLAN](../docs2.0/BUILD-PLAN.md) and [3.0 BUILD-PLAN](../docs3.0/BUILD-PLAN.md).

**Principle:** prove the fun in solo first. If a match against bots is not fun, multiplayer will not save it.

---

## S1 — Engine core (no UI)

- `lib/game/engine/`: `state.ts` (types + zod), `rules.ts`, `rng.ts`, phases from [SYSTEMS §10](SYSTEMS.md#10-resolution-order), `causes.ts`, `score.ts`, `news.ts` (templates), `history.ts`.
- `lib/game/engine/cards/`: the 32 cards from [ACTIONS §3](ACTIONS.md#3-library-v1-32-cards), `suggestCards()`.
- `lib/game/engine/projects.ts`: the 16 projects. `events/`: 16 events and 16 crisis cards, 4 scenarios.
- `lib/game/bots/`: utility AI, 6 personalities, 3 difficulties, proposal answers.
- `lib/game/seed/build-seed.ts`: `data/live` + `data/curated` → `data/game/seed-2026.json` for the 6 countries.
- `scripts/selfplay.ts`: headless bot matches with a balance report.
- Replace the untracked draft `lib/game/types.ts`.
- Tests (Vitest): every formula, every card's `legal` and `apply`, determinism (golden replays run twice), no `Math.random` in the engine (lint rule).

**Done when:** `selfplay` runs 10,000 matches without errors; every country wins 12–22% at Normal; every stat change in a sample match has a cause chain; a golden replay is identical across runs.

## S2 — UI prototypes (can run in parallel with S1)

- Three clickable HTML prototypes in `all_refrence-ui/prototype-statecraft-4/` ([UI-DESIGN §11](UI-DESIGN.md#11-prototype-first)): the scrollable Play page; one full turn including the reveal and Why chain; match end with the share card.
- Use the real tokens, fonts and a screenshot or the 1.0 globe.
- Publish for review.

**Done when:** the owner approves the look and feel. Changes go back into UI-DESIGN.md.

## S3 — Solo match (client-only)

- Route `/play/match/solo` running the engine in the browser.
- Match layout ([UI-DESIGN §5.5](UI-DESIGN.md#55-match-layout-desktop--1200-px)): top bar, left rail, command panel with the 5 steps, orders tray, Lock.
- Brief with crisis cards and advisors; Budget sliders with forecast; Projects; Actions with suggested cards and the All actions drawer; Diplomacy with the proposal composer and bot answers.
- The reveal (GSAP timeline), result sheet, Why chain, news, ranking reorder.
- Match end: final ranking, Leader Score, history timeline, share card preview (local image).
- Tutorial match ([UI-DESIGN §5.10](UI-DESIGN.md#510-first-match-tutorial)).
- Motion tokens in `lib/motion.ts`; game tokens in `app/globals.css`; sound with mute.
- Mobile layout with the bottom sheet.
- Tests: Vitest for stores and components; Playwright for a full solo match (fast mode) and for accessibility (axe).

**Gate — fun playtest:** 5–8 people who have never seen the game each play two matches. Targets in [ENGAGEMENT §9](ENGAGEMENT.md#9-metrics). If the gate fails, fix the engine and UI here; do not start S5.

## S4 — Play page and sharing

- `/play` scrollable page ([UI-DESIGN §5.2](UI-DESIGN.md#52-play-page--play-scrollable)) with Start (solo until S6), the sticky "How a year works" story, the 6 country cards, the Why and ranking demos, the history marquee, FAQ.
- Public history page and OG share image (`opengraph-image` route). Solo results are verified on the server before they become public ([MULTIPLAYER §7](MULTIPLAYER.md#7-solo-mode-and-result-verification)), so this step adds the first small backend piece.
- Header **Play** link.

**Done when:** a new visitor reaches a running match in two taps; Play page LCP < 2.5 s on a mid-range phone; a shared link shows the card preview in WhatsApp and X.

## S5 — Multiplayer rooms

- Supabase: anonymous auth (guests), tables and RLS from [MULTIPLAYER §5](MULTIPLAYER.md#5-data-model-supabase-postgres), `claim_turn` SQL, pg_cron tick.
- Route handlers from [MULTIPLAYER §6](MULTIPLAYER.md#6-api-route-handlers-under-appapigame); the engine runs on the server; the client keeps only the forecast.
- Create room, Join with code, lobby, host start, bots fill seats.
- Realtime: lock status, proposals between humans, `turn.resolved`; polling fallback.
- Leavers, caretaker, rejoin.

**Gate:** 3 friends finish a 3-human room match without a desync or a stuck turn; Playwright multi-context tests pass.

## S6 — Quick Match

- Queue, matchmaker, country preferences and assignment, the search overlay, 40 s bot fill.
- Start on the Play page now opens Quick Match.
- Load test with 50 simulated clients.

**Done when:** median wait < 40 s; no match starts with a seat conflict; the load test shows no stuck turns.

## S7 — Progression and free text

- Profiles, XP, levels, titles, country mastery, achievements, scenario unlocks ([ENGAGEMENT §5](ENGAGEMENT.md#5-progression-s7)).
- "What if?" re-simulation.
- Daily Crisis.
- Free-text order bar with the keyword parser and the 150-sentence golden set ([ACTIONS §8](ACTIONS.md#8-free-text-order-bar-s7-optional)).

**Done when:** the parser reaches 80% on the golden set; Daily Crisis can be played and shared in under 3 minutes.

## S8 — The bigger world

- Conflict: mobilise, blockade, strikes and war, reusing the 2.0 design ([2.0 GAME-DESIGN §8](../docs2.0/GAME-DESIGN.md#8-conflict)).
- More countries (Germany, Brazil, UK, Pakistan) and a Tech group of cards.
- Elections, migration and ageing as separate systems.
- Async seasons, weekly world, ranked rating.
- Monetization only after the owner answers D-1.

Each item gets its own small plan before it starts.

## Order and dependencies

```
S1 Engine ───────────┐
S2 Prototypes ───────┼──► S3 Solo match ──► [fun gate] ──► S4 Play page + share
                     │                                       │
                     │                                       ▼
                     └──────────────────────────────► S5 Rooms ──► S6 Quick Match ──► S7 ──► S8
```
