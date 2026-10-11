# Statecraft 4.0 — Multiplayer and Architecture

| Field | Value |
|---|---|
| Version | 4.0 (final, 2026-10-11) |
| Date | 2026-10-11 |
| Related | [SYSTEMS](SYSTEMS.md) · [UI-DESIGN](UI-DESIGN.md) · [BUILD-PLAN](BUILD-PLAN.md) · base: [2.0 ARCHITECTURE](../docs2.0/ARCHITECTURE.md) |

> Next.js 16 in this repo has breaking changes (see `AGENTS.md`). Before writing route handlers, `after()`, proxy or OG images, read the matching guide in `node_modules/next/dist/docs/`.

The stack, the server-authoritative round loop and the engine package from [2.0 ARCHITECTURE](../docs2.0/ARCHITECTURE.md) stay. This document gives the 4.0 changes: 6 seats, yearly turns, in-turn negotiation, matchmaking, and a client-only solo mode first.

---

## 1. Modes

| Mode | Players | When | Notes |
|---|---|---|---|
| **Solo** | 1 human + 5 bots | S3 | Engine runs in the browser. No backend needed to play. |
| **Private room** | 2–6 humans + bots | S5 | Create room / Join with code (D-9). Friends. |
| **Quick Match** (the **Start** button) | 1–6 humans + bots | S6 | Matchmaking queue. |
| Coalition (3 v 3) | 6 humans or bots in 2 blocs | S8 | Shared bloc score; deals inside a bloc cost 0 PC. |
| Async season | many, 1 turn per day | S8 | Same engine, 24 h turn timer. |
| Ranked | Quick Match with rating | S8 | Only when the player base is large enough. |

Each match is an **isolated world**. 600 players online = about 100 matches, each with its own state. A move in match #47 never affects match #48.

## 2. Quick Match

```
Player taps Start
   │  picks up to 3 countries in order, or "Any"
   ▼
queue_tickets (player, prefs, created_at)
   │
   ▼  matchmaker runs every 2 s (route handler triggered by queue activity; pg_cron backup)
form a match when:
   • 6 humans are waiting, or
   • the oldest ticket has waited 40 s and ≥ 1 human is waiting, or
   • a player taps "Play now with bots"
   │
   ▼
assign countries → create match → fill free seats with bots → notify players → briefing
```

**Country assignment:** process tickets oldest first; each player gets their highest free preference; "Any" players take what is left after everyone else. Players who got their first choice are recorded, and the next match favours players who did not.

**Why 40 s:** a short wait keeps the game moving when few players are online. A human never waits more than 40 s, because bots can always fill the world.

## 3. Private rooms

- **Create room** → a 5-character code (no ambiguous letters: no O/0, I/1) and an invite link.
- The host sets: turn speed (Standard 90 s or Relaxed 150 s), bot difficulty, scenario (Random or chosen).
- Players pick countries in the lobby (first come, first served). The host starts; bots fill free seats.
- If the host leaves the lobby, the oldest remaining player becomes host.
- Rooms are unranked.

## 4. In a match

### 4.1 Turn loop

```
PLANNING (deadline T = 120 / 105 / 90 s)
  client → POST /api/game/matches/:id/orders      (save draft orders; any time)
  client → POST /api/game/matches/:id/lock        (lock / unlock)
  client → POST /api/game/proposals               (send; bots answer at once on the server)
  client → POST /api/game/proposals/:pid/answer   (human answers)
  client → POST /api/game/matches/:id/vote         (World Vote on turns 3, 6, 9; hidden until resolve)
  server → broadcast {type:'seat.locked', seat} / {type:'proposal', id}

RESOLVE when all humans locked OR now ≥ T:
  any client → POST /api/game/matches/:id/resolve   (clients call it when the timer ends)
  pg_cron     → POST /api/game/tick                 (backup, every 30 s)
  SQL claim_turn(match, turn) — only one caller wins
  load state, orders, accepted proposals → bots decide for bot/caretaker seats
  engine.resolveTurn(state, orders, rng) → next state, causes, news, replay script
  one transaction: insert turn_states[turn+1], events; update match (turn+1, deadline)
  after(): broadcast {type:'turn.resolved', turn}

REVEAL (≤ 20 s): clients fetch the result and play the replay; "skip" is local.
The next PLANNING deadline starts when every human has sent "ready" or after 20 s.
```

- **Idempotent:** `turn_states (match_id, turn)` is unique. A retried resolve only re-broadcasts.
- **Fast:** resolving 6 seats is pure CPU, well under 50 ms.
- **Hidden information:** other seats' orders are never readable until the turn resolves (RLS + route handlers).

### 4.2 Negotiation inside a turn

- A proposal to a **bot** is answered on the server at once (bot utility, [GAME-DESIGN §15](GAME-DESIGN.md#15-bots)).
- A proposal to a **human** appears in their inbox through Realtime. They can Accept, Reject or Counter until they lock. Unanswered proposals expire at resolve and the PC is refunded.
- One counter per proposal. Accepted proposals become treaties at the start of resolution.

### 4.3 Leavers, reconnects and caretakers

| Case | Behaviour |
|---|---|
| Tab closed or network lost | Presence drops. Orders already saved still count. The seat auto-locks at the deadline. |
| Absent for 2 turns | The seat becomes **caretaker**: the bot plays it with the same personality. A banner tells the others. |
| Player returns | "Rejoin" restores control at the next planning phase. |
| Every human gone | The match continues with bots for up to 2 turns, then pauses; it is closed after 24 h. |

## 5. Data model (Supabase Postgres)

```
profiles      (id uuid pk = auth.users.id, handle, leader_name, portrait, xp, level, created_at)
queue_tickets (id, profile_id, prefs text[], created_at, status)
matches       (id, code, mode, scenario, seed, engine_version, turn, phase, deadline_at,
               settings jsonb, status, created_at, ended_at)
seats         (match_id, iso3, profile_id null, kind 'human'|'bot'|'caretaker',
               locked bool, ready bool, last_seen_at)                pk (match_id, iso3)
turn_states   (match_id, turn, state jsonb, created_at)             pk (match_id, turn)
orders        (match_id, turn, iso3, orders jsonb, locked_at)       pk (match_id, turn, iso3)
proposals     (id, match_id, turn, from_iso3, to_iso3, terms jsonb, status, parent_id, created_at)
events        (match_id, turn, seq, kind, payload jsonb)            causes, news, replay script
results       (match_id, iso3, profile_id, leader_score, power_start, power_end, rank, won bool)
histories     (match_id pk, summary jsonb, public bool)             end-of-match history page + share card
```

- RLS on every table. Players **read** their own matches; they never **write** game tables directly. All writes go through route handlers with the service-role key on the server.
- State size: one `turn_states` row ≈ 15 KB. A finished match ≈ 13 rows + events ≈ 300 KB. Old matches keep only `results` and `histories` after 30 days (pruned by pg_cron), which keeps the free 500 MB database within limits.

## 6. API (route handlers under `app/api/game/`)

| Route | Use |
|---|---|
| `POST /queue` · `DELETE /queue` | Join or leave Quick Match |
| `POST /rooms` · `POST /rooms/:code/join` · `POST /rooms/:code/start` | Private rooms |
| `GET /matches/:id` | Current state visible to this player |
| `POST /matches/:id/orders` · `/lock` · `/ready` · `/resolve` | Turn loop |
| `POST /matches/:id/vote` | World Vote (stored with the seat's orders; others see only "voted") |
| `POST /proposals` · `POST /proposals/:pid/answer` | Diplomacy |
| `POST /tick` | Cron backup: resolve overdue turns, run the matchmaker |
| `POST /solo/verify` | Verify a solo match for XP (§7) |
| `GET /history/:id` | Public history page data; OG image at `app/play/match/[id]/history/opengraph-image` |

All inputs are validated with `zod` (already in the repo). The engine's `legal()` checks run again on the server.

## 7. Solo mode and result verification

- In S3 the whole solo match runs **in the browser**: the engine, the bots and the seed JSON. This costs nothing and works offline after loading.
- To award XP or show the result on a public page, the client sends `{ seed, engineVersion, orders per turn }` to `/solo/verify`. The server replays the match with the same engine. If the result matches, it is saved. Because the engine is deterministic, cheating would need a different engine, and the replay would not match.

## 8. Realtime

- One channel per match: `match:{id}`. **Broadcast** for small notifications (`seat.locked`, `proposal`, `turn.resolved`, `ready`). Never full state; clients refetch over HTTP. **Presence** for who is online.
- One channel for the queue screen: `queue:{ticketId}` gets `match.found`.
- Fallback: if Realtime is unavailable or the connection cap is reached, clients poll `GET /matches/:id` every 3 s during planning. The game still works, just less instantly.

## 9. Security and fair play

- Server is the only authority. Clients only run the forecast.
- Rate limits on proposals (max 6 per turn per seat) and on queue joins.
- Private rooms are unranked, so friends cannot farm rating by colluding.
- No free text between players in the MVP (proposal cards only), so no chat moderation is needed yet.

## 10. Capacity and cost

Free-tier figures below are from third-party summaries of 2026 pricing; confirm them on the Supabase and Vercel pricing pages before launch.

| Resource | Free tier | Statecraft use | Limit reached at |
|---|---|---|---|
| Supabase Realtime connections | ~200 concurrent | 1 per online player | ~200 players online at once (≈ 33 matches) |
| Supabase Realtime messages | ~2M / month | ≈ 60 deliveries per turn → ≈ 800 per match | ≈ 2,500 matches per month |
| Supabase database | 500 MB | ≈ 300 KB per match, pruned after 30 days | Comfortable with pruning |
| Supabase projects | Paused after 7 days without activity | Keep alive with the cron tick | — |
| Vercel Hobby | Function invocations and bandwidth within Hobby limits; **non-commercial use only** | Route handlers are short | Paid plan needed once the game earns money |

**Scaling path:**
1. Free tiers: solo is unlimited (client-side). Multiplayer up to ~200 players online.
2. Supabase Pro (~$25/month): ~500 concurrent connections, ~5M messages.
3. Beyond that: plan B from 2.0 — PartyKit or Cloudflare Durable Objects for per-match rooms, with Supabase kept for accounts and history.

At 600 players online the server work is small (100 matches × 1 resolve per ~110 s ≈ 1 resolve per second, < 50 ms each). The limit is the number of open realtime connections, not CPU.

## 11. Testing

- **Engine:** unit tests per formula and per card; golden replays (seed + orders → exact final state); a determinism test runs every golden replay twice.
- **Self-play:** CLI runs thousands of bot matches for balance ([GAME-DESIGN §16](GAME-DESIGN.md#16-balance-method)).
- **Multiplayer:** Playwright tests with 2–3 browser contexts in one room (lock, proposal, counter, disconnect, caretaker, rejoin).
- **Load:** a script opens 50 simulated clients across 9 matches against a staging project before S6 ships.
