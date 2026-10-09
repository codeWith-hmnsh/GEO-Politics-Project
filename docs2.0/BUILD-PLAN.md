# Statecraft — Build Plan

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Related | [PRD.md](PRD.md) · [GAME-DESIGN.md](GAME-DESIGN.md) · [UI-DESIGN.md](UI-DESIGN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [MONETIZATION.md](MONETIZATION.md) |

Two rules decide the order:
1. **Fun before network.** The game must be fun solo against bots (G1) before any multiplayer code.
2. **Every gate is a playtest.** A milestone is done when its checks pass *and* real people played it.

Weeks assume 1–2 developers part-time, like 1.0.

```
G0 Foundations ─► G1 Solo sandbox ─► G2 Multiplayer core ─► G3 Diplomacy & trade ─► G4 Conflict
   wk 1             wk 2–5              wk 6–7                 wk 8–9                  wk 10–11
─► G5 Chronicle & ranking ─► G6 Retention ─► G7 Launch polish ─► G8 Monetization (gated)
     wk 12–13                  wk 14–15        wk 16–17            after metrics
```

---

## G0 — Foundations (week 1)

### Tasks
- [ ] Owner answers decisions D-1 … D-8 ([PRD §14](PRD.md#14-decisions-needed)).
- [ ] Replace draft `lib/game/types.ts` with `lib/game/engine/state.ts` (ARCHITECTURE §4); remove or archive `supabase/game_tables.sql` and `docs/GAME-PLAN.md` once this folder is approved.
- [ ] `lib/game/engine/` skeleton: `rules.ts`, `rng.ts` (mulberry32 + hash), `index.ts` with `resolveRound()` stub; ESLint rule banning `Math.random` and `Date.now` inside the engine.
- [ ] `lib/game/seed/build-seed.ts` → `data/game/seed-2026s1.json` for the 10 seats from `data/live` + `data/curated` (GAME-DESIGN §3.1). Add World Bank health/education spend to ingest if missing.
- [ ] `/play` route with placeholder hub; header "Play" item behind flag `config/flags.ts → statecraft`.
- [ ] Static prototype `all_refrence-ui/prototype-statecraft/` (UI-DESIGN §13): hub, lobby, HUD, budget, offer, request, strike, replay, Chronicle; screenshots `sc-*.png`.

### Done when
- Seed file builds from repo data with a unit test that checks ranges; prototype screens are approved by the owner; lint, typecheck, tests pass.

## G1 — Solo sandbox (weeks 2–5) — the fun gate

Goal: one player vs 9 bots, entirely in the browser (no Supabase), playing a full 12-round term.

### G1.1 Engine v1 (weeks 2–3)
- [ ] Phases: budget, projects, trade (tariff, embargo, sanction, world market), supply and prices, people and elections, tension, score (GAME-DESIGN §4–7, §10).
- [ ] Causes: every `StatChange` has `causeId`; chain builder.
- [ ] Conflict v1: mobilise, strike (interception, target types, casualty range), war costs, ceasefire (offer accepted by bots).
- [ ] Wire templates for every event type (GAME-DESIGN §14).
- [ ] Tests: golden tests for the embargo chain, strike odds, election, scoring; determinism test; property tests.

### G1.2 Bots v1 (week 3)
- [ ] Utility AI with 5 personalities and 3 difficulties; offer answering by utility + trust.
- [ ] `npm run game:selfplay` headless runner; balance report (per-country score spread, catastrophe rate, decision usage).

### G1.3 Solo UI (weeks 4–5)
- [ ] `/play/sandbox`: briefing, HUD (TopBar, Cabinet, TargetPanel, OrderTray, CategoryDock), BudgetSheet with live forecast (Web Worker), ProjectGrid, StrikePlanner with hold-to-confirm, Inbox/Wire, CauseChain.
- [ ] Game globe layers: StatusFill, SeatPins, ContractFlows, SanctionArcs, StrikeArcs, FrontMarkers.
- [ ] ReplayDirector with the §4.11 choreography and reduced-motion list mode.
- [ ] Results screen (score breakdown) — Chronicle comes in G5.

### Done when
- A full term plays end to end in ≤ 30 min with no console errors; self-play spread ≤ ±15 % (tightened to ±10 % by G7).
- **Fun gate:** 8 people play the sandbox; ≥ 6 say they want to play again; every confusing moment is logged and fixed or ticketed. If the gate fails, iterate G1 — do not start G2.

## G2 — Multiplayer core (weeks 6–7)

Needs the Supabase project (D-7).

### Tasks
- [ ] Migration `0002_game.sql` (ARCHITECTURE §5) + RLS + `claim_round` SQL function + redacted state view.
- [ ] Supabase Auth: anonymous guests, Google, magic link; guest → account upgrade; profiles + handle filter.
- [ ] APIs: rooms, quick match, join, seat, ready, start, state, orders, resolve, tick (ARCHITECTURE §6).
- [ ] Realtime channel `match:{id}`: broadcast notifications + presence; client `useMatch` (TanStack Query + channel).
- [ ] pg_cron + pg_net → `/api/game/tick` every 30 s with shared secret.
- [ ] Lobby UI (country picker on globe, seats, bots fill, settings, invite link).
- [ ] Caretaker bot on 2 missed rounds; reconnect flow.

### Done when
- 3 browsers (Playwright) finish a Blitz match; killing one tab mid-round → caretaker plays → tab returns and continues; double-resolve test proves idempotency; RLS tests prove orders are hidden.
- **Playtest:** 2 groups of 4–6 friends play Standard over the internet.

## G3 — Diplomacy and trade depth (weeks 8–9)

### Tasks
- [ ] Offers: all kinds in GAME-DESIGN §5.3, counter-offers, expiry, decline costs shown before choosing.
- [ ] Goods contracts, trade deals, joint sanctions, secondary-sanction prompt, aid and loans, IMF programme.
- [ ] Alliances, non-aggression pacts, call to arms, treaty breaking, trust.
- [ ] OfferBuilder, OfferModal, Inbox; envelope arcs in replay; quick phrases + emoji reactions.
- [ ] Bots: send and answer all offer kinds.

### Done when
- The two example chains (US oil embargo → Russia help; China food → Russia grain) reproduce in a scripted test and in a live playtest.

## G4 — Conflict depth (weeks 10–11)

### Tasks
- [ ] Blockade, cyber, ground offensive + front meter + capitulation, arms transfer, air-defence deployment, intel sharing reveal.
- [ ] Nuclear deterrence and alert; Tension brink effects; catastrophe end state.
- [ ] BlockadeRings, FrontMarkers polish; Tension UI (§4.13); election moment (§4.12).
- [ ] Content review of every war string against UI-DESIGN §11.

### Done when
- Self-play: median wars per match 1–2, catastrophe rate < 5 %; playtest finds no "instant win" combo.

## G5 — Chronicle and ranking (weeks 12–13)

### Tasks
- [ ] Chronicle generator (lead = highest severity × reach, 3 stories, timeline, standings, verdicts); `/play/match/[id]/results`; `opengraph-image`.
- [ ] Leader Score finalisation, titles, Leader Rating (ranked), seasons, country bests.
- [ ] Leaderboards page, leader profile with country dossier.
- [ ] Ranked queue (rating-matched).
- [ ] Optional LLM wire/Chronicle rewrite behind flag (D-5), with fact-check fallback.

### Done when
- Share card renders correctly on WhatsApp/X/Discord previews; rating math unit-tested; Chronicle never shows without the Simulated stamp (test).

## G6 — Retention (weeks 14–15)

### Tasks
- [ ] Daily Crisis (seeded scenario per day, daily leaderboard, streak, share card).
- [ ] Async rooms (12 h rounds), email + web push "your turn" and "request waiting".
- [ ] World events deck (P1), secret agendas (P1), rematch in one tap.
- [ ] How to play (Stepper tutorial on a mini sandbox).
- [ ] Analytics events for every PRD §12 metric (cookieless).

### Done when
- Open beta running; metrics dashboard shows completion, rematch, D1/D7, start time, share rate.

## G7 — Launch polish (weeks 16–17)

### Tasks
- [ ] Mobile layout (UI-DESIGN §9), lite globe tier checks on mid Android.
- [ ] Accessibility pass (axe, keyboard path, live regions, Relaxed timer, pause in private rooms).
- [ ] Balance to ±10 % spread with live data; tune rules.ts.
- [ ] Moderation: report/mute flows, name filter review, abuse runbook.
- [ ] Explore ↔ Play links (real-world facts in briefing and cause chain; "Play this crisis" on 1.0 conflict panels).

### Done when
- PRD §11 non-functional checks pass; public launch.

## G8 — Monetization (only after the gate)

Gate: Day-7 return ≥ 12 %, rematch ≥ 40 %, ≥ 1,000 weekly active players for 4 weeks.

### Tasks
- [ ] Vercel Pro, legal review (MONETIZATION §5), payment gateway, entitlements table + webhook.
- [ ] Premium (Advisor Debrief, practice replays, rooms, scenario editor), Leader Pass, first 2 scenario packs.
- [ ] Store page with "Premium never changes who wins a ranked match."

### Done when
- Test purchases end to end in sandbox mode; entitlements never read by the engine (test).

---

## Working agreement
- One commit per finished task group; continue to the next without waiting (owner preference from 1.0).
- Stop and ask only for: accounts and keys (Supabase, Google OAuth, payments), product decisions D-x, or anything irreversible.
