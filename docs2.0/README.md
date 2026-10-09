# Geo-Politics 2.0 — Statecraft (Multiplayer) — Documentation

**Status: plan for review (2026-10-10).** Decisions marked **D-x** in [PRD.md §14](PRD.md#14-decisions-needed) need the owner's answer before G2 starts. G0–G1 can start now.

Geo-Politics 1.0 (in [`../docs/`](../docs/)) teaches what is happening in the world. **2.0 adds a way to play it:** each player becomes the leader of one real country in a shared, living world. Every decision has consequences that ripple across the same 3D globe, other players react, and a chain reaction writes an alternate history. When the match ends, that history becomes a simulated newspaper — *The World Chronicle* — and the leaders are ranked.

> **One line:** *Run a country. Shape the world. Every decision has a consequence.*

## Read in this order

| # | Doc | What it answers |
|---|---|---|
| 1 | [PRD.md](PRD.md) | What we build, for whom, why; is it feasible and free; requirements; metrics; risks; decisions needed. |
| 2 | [GAME-DESIGN.md](GAME-DESIGN.md) | The rules: country model, budget, projects, the full action space, trade and supply chains, war, diplomacy, world events, scoring, ranking, bots, balance. |
| 3 | [UI-DESIGN.md](UI-DESIGN.md) | How it looks and moves: theme extension, every screen with wireframes, components, motion, replay choreography, accessibility, reference study. |
| 4 | [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, server-authoritative round loop, realtime, data model, engine package, APIs, security, cost at scale. |
| 5 | [MONETIZATION.md](MONETIZATION.md) | An honest review of the paywall idea, the recommended model, prices, legal limits in India. |
| 6 | [BUILD-PLAN.md](BUILD-PLAN.md) | Milestones G0–G8 with tasks, playtest gates and done criteria. |

## What stays from 1.0

- The approved look: paper theme, white glass cards, Manrope + Fraunces, the satellite globe, the camera feel ([`../docs/UI-DESIGN.md`](../docs/UI-DESIGN.md), [`../all_refrence-ui/prototype-v3/`](../all_refrence-ui/prototype-v3/)).
- The data: IMF / World Bank indicators, Capability Index, energy, trade partners, relations, nuclear status — they seed every country's starting state.
- The globe layers: trade lanes, ships, sanctions arcs, war glows, missile arcs, relation fills, choropleth overlay.
- The neutrality rules from [`../docs/CONTENT-GUIDE.md`](../docs/CONTENT-GUIDE.md), extended for simulated content (everything the game invents is labelled **Simulated**).

## Relation to the earlier draft

This folder supersedes the untracked draft [`../docs/GAME-PLAN.md`](../docs/GAME-PLAN.md) (with `lib/game/types.ts` and `supabase/game_tables.sql`). Main changes:

| Area | Draft | 2.0 plan | Why |
|---|---|---|---|
| Players | 2–4, 8 countries | 10 seats, 2–10 humans, bots fill empty seats | The idea needs a full world; bots solve empty lobbies |
| Turn model | 45 s / 15 s / 30 s phases, 15–20 rounds | Round = one quarter; 12 rounds = one 3-year term; Blitz, Standard and Async speeds | Clear time story, shorter matches, async for retention |
| Spending | Flat "budget units" | Real-feeling $B budget with ministry sliders + one-off projects (hospitals, schools, jets) as % of GDP | Your hospitals/tanks idea, fair across big and small countries |
| Supply chains | Fixed % rules | Four goods + world market with prices; embargoes move world prices | "China ne mana kiya → alternative supplier" works naturally |
| Scoring | Absolute stats | 500 = held steady; score = improvement from your own start | India can beat the USA; rank 1 ≠ biggest army |
| War | Single strength ratio | Strikes with interception, front-line meter, alliance call-to-arms, global Tension clock, no playable nuclear strike | Real consequences without gore; avoids instant-win buttons |
| Narrator | Gemini, Phase 4 | Templates first ($0); optional LLM later (D-5) | Free MVP; LLM is polish, not a dependency |
| Monetization | None | Pay for depth, comfort and style; never for power in ranked (D-1) | Keeps the ranking worth chasing — see MONETIZATION.md |
