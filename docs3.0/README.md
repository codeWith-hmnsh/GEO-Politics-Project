# Geo-Politics 3.0 — Statecraft: Open Orders — Documentation

**Status: plan for review (2026-10-11).** This folder builds on [`../docs2.0/`](../docs2.0/). It changes one thing at the core: **how a leader gives orders and how other leaders answer.** Everything 2.0 says about the world, the globe, the engine, scoring and the theme still holds unless a doc here says otherwise.

> **One line:** *Say what you want to do. The world decides what is possible.*

## The problem this solves

In 2.0 a leader picks from a fixed list: build hospitals, sanction, strike, ask for help. Players learn the list in a few matches. The opponent can also only answer from the same list, so negotiation feels like menu clicking. The owner asked for a game where a leader can try their own idea and the other side can answer in their own words.

## The answer in one picture

```
           ┌────────────────────────────────────────────┐
 player →  │ ✎ What do you want to do this round?       │   ONE order bar
           │ [Cut oil imports] [Build hospitals] [Ask…] │   type or tap
           └────────────────────────────────────────────┘
                            │
             AI reads the sentence (translator only)
                            │
           ┌────────────────────────────────────────────┐
           │ REDUCE IMPORT · India ← Russia · Oil       │   ORDER CARD
           │ [40% ▾] for [3 rounds ▾]                   │   every field editable
           │ Engine forecast: oil price +4%, trust −8   │
           │                         [Edit] [Confirm]   │
           └────────────────────────────────────────────┘
                            │
             Validator checks the real world limits
                            │
             Deterministic engine resolves the round
```

- The AI only **translates** words into an order card. It never sets a number.
- The **engine** computes every cost and consequence, the same way for every player.
- The **card** is what the player confirms, so a misread costs one tap to fix.
- Replies between leaders use the same bar. A reply becomes a **proposal card** with *gives / wants / duration*, answered with **Accept, Reject or Counter**.

## Read in this order

| # | Doc | What it answers |
|---|---|---|
| 1 | [ACTION-SYSTEM.md](ACTION-SYSTEM.md) | The order bar, order cards, the action vocabulary, the AI interpreter, the validator, ambiguity, refusals. |
| 2 | [DIPLOMACY.md](DIPLOMACY.md) | Negotiation: proposals, counters, conditions, treaties, broken promises, public and private messages. |
| 3 | [ENGAGEMENT.md](ENGAGEMENT.md) | Where the excitement and the reason to come back come from, round by round and match by match. |
| 4 | [UI-DESIGN.md](UI-DESIGN.md) | Order bar, cards, inbox, negotiation thread, motion, mobile, empty and error states. |
| 5 | [ARCHITECTURE.md](ARCHITECTURE.md) | Interpreter pipeline, schemas, APIs, prompt design, safety, determinism, cost. |
| 6 | [BUILD-PLAN.md](BUILD-PLAN.md) | The vertical slice first (4 countries, oil + grain), then growth. Replaces the order of G1–G3 in 2.0. |

## What changes from 2.0

| Area | 2.0 | 3.0 | Why |
|---|---|---|---|
| Giving orders | Dock with six drawers of action cards | One order bar: type a sentence or tap a chip; both produce an order card | Players are not limited to a list they can memorise |
| Action space | Fixed list of actions | A vocabulary of verbs with open parameters (target, resource, amount, duration, condition) | Combinations grow much faster than a list |
| Diplomacy | Accept / Decline on fixed request types | Proposal cards with gives / wants / duration; Accept, Reject, Counter | The China reply "only if you keep US support away" becomes a real deal |
| AI | Optional narrator (D-5) | Interpreter for free text (needed for open orders); narrator still optional | Free text cannot be understood without a language model |
| Match length | 12 rounds (one 3-year term) | **8 rounds, 20–25 minutes** | Shorter sessions, more matches per evening |
| MVP world | 10 seats | **4 countries, 2–4 humans, oil + grain** for the first slice | Prove the fun before building the full world |
| Unknown ideas | Not possible | Logged to a "wish list"; the most requested become new verbs | The game grows from what players try |

## What stays from 2.0

- Server-authoritative, deterministic TypeScript engine; seeded RNG; cause chains on every stat change ([2.0 ARCHITECTURE §4](../docs2.0/ARCHITECTURE.md#4-engine-package)).
- Leader Score (500 = held steady), the five score dimensions, rating and titles.
- Globe replay, World Wire, World Chronicle, Tension clock, no playable nuclear strike.
- Entry flow D-9: Start, Create room, Join with code, pick a free country, bots hold free countries.
- Paper theme, Manrope + Fraunces, white glass cards, tokens from `app/globals.css`.
- Monetization stance D-1: never sell power in ranked.

## Decisions needed

| # | Question | Recommendation |
|---|---|---|
| E-1 | Interpreter model | Start on `claude-haiku-5-5` (about $0.03 per match); move to `claude-opus-5-5` (about $1.30 per match) if Haiku misreads too often in playtests. See [ARCHITECTURE.md §8](ARCHITECTURE.md#8-cost). |
| E-2 | Free-text orders per round | 3 order slots per round (same as 2.0); free text and chips share the slots. |
| E-3 | Private chat between leaders | Proposal cards only in the slice; free chat later, with moderation. |
| E-4 | Conditional (IF/THEN) orders | After the slice. Proposal conditions cover the main need first. |
| E-5 | First slice countries | India, China, USA, Russia. |
