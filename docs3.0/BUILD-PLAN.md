# Statecraft 3.0 — Build Plan

Build one thin, complete slice first. Grow only after playtests say it is fun. This replaces the order of G1–G3 in [2.0 BUILD-PLAN](../docs2.0/BUILD-PLAN.md); G0 (foundations) and G5–G8 stay as written there.

## The slice

| Item | Scope |
|---|---|
| Countries | India, China, USA, Russia (E-5) |
| Players | 2–4 humans; bots fill the rest |
| Goods | Oil, grain |
| Verbs | Trade, economy and diplomacy verbs from [ACTION-SYSTEM.md §4](ACTION-SYSTEM.md#4-vocabulary-first-slice) |
| Match | 8 rounds, 20–25 minutes |
| Must have | Order bar, cards, interpreter, validator, forecast, proposals with counter, treaties, globe replay, cause chains, Chronicle |
| Not yet | Military, intelligence, IF/THEN orders, free chat, 10 seats, extra modes |

## S0 — Vocabulary and engine (week 1–2)

- Write `vocabulary.ts` with the slice verbs, cost formulas and cause templates.
- Seed the 4 countries from 1.0 data; add oil and grain flows.
- `validate.ts`, `forecast.ts`, resolve for trade and economy verbs.
- Unit tests for every verb.

**Done when** a script plays 8 rounds with random valid cards and every stat change has a cause chain.

## S1 — Solo with chips (week 3)

- Order bar UI with chips and composer only (no AI yet).
- Order cards, slots, forecast, lock, reveal on the globe.
- Bots from 2.0 use the same cards.

**Done when** one person can finish a match against three bots and explain why their GDP moved.

## S2 — Interpreter (week 4)

- `interpret` route, prompt from `vocabulary.ts`, zod schema, fallback.
- Golden set of 200 sentences; reach the pass bar in [ARCHITECTURE.md §7](ARCHITECTURE.md#7-testing).
- `ask`, `unsupported` (with wish list) and `refused` states in the UI.

**Done when** 70% of free-text orders in an internal playtest are confirmed without edits.

## S3 — Proposals and treaties (week 5)

- Proposal cards, counter threads, accept and reject, expiry.
- Treaty checks at resolve, `onBreak`, reliability.
- Bots answer proposals.

**Done when** the Russia–India example in [DIPLOMACY.md §1](DIPLOMACY.md#1-the-owners-example-step-by-step) plays end to end, including a broken treaty.

## S4 — Multiplayer slice (week 6–7)

- Supabase tables from [ARCHITECTURE.md §4](ARCHITECTURE.md#4-data-model-additions-supabase), realtime inbox, server lock and resolve (2.0 round loop).
- Create room and Join with code; Start into a shared world (D-9).

**Done when** four people on four devices finish a match with no desync.

## S5 — Chronicle and What if? (week 8)

- Chronicle from the event log with quoted player words.
- What if? re-simulation from a chosen round, unranked.

**Done when** the fun gate passes.

## Fun gate (after S5)

Run 10 playtest matches with real players. Continue to the 2.0 milestones (10 seats, conflict, ranking, retention, monetization) only if the [ENGAGEMENT.md §7](ENGAGEMENT.md#7-metrics-for-the-slice-playtest) targets are met for at least three of the five metrics. If not, fix the slice first.

## After the gate

1. Grow to 10 seats and four goods (2.0 G2–G3 content).
2. Security verbs with 2.0 conflict rules (G4).
3. IF/THEN orders (E-4), intelligence, free chat (E-3).
4. Ranking, retention and monetization (2.0 G5–G8).
