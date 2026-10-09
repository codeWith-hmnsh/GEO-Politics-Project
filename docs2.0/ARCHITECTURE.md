# Statecraft — Technical Architecture

| Field | Value |
|---|---|
| Version | 1.0 (plan for review) |
| Date | 2026-10-10 |
| Related | [PRD.md](PRD.md) · [GAME-DESIGN.md](GAME-DESIGN.md) · [UI-DESIGN.md](UI-DESIGN.md) · [BUILD-PLAN.md](BUILD-PLAN.md) · 1.0: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) |

> Next.js 16 in this repo has breaking changes from older versions (see `AGENTS.md`). Before writing route handlers, proxy, `after()` or OG images, read the matching guide in `node_modules/next/dist/docs/` (`01-app/01-getting-started/15-route-handlers.md`, `16-proxy.md`, `14-metadata-and-og-images.md`, `03-api-reference/04-functions/after.md`).

---

## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| App | Same Next.js 16 app (App Router, TS, Tailwind v4, shadcn, Motion, React Bits) | One product, one deploy, shared globe and tokens |
| Game rules | **`lib/game/engine/`** — pure TypeScript, no I/O, deterministic | Runs on server (authority), client (forecast/preview) and CI (bot self-play) |
| Database | **Supabase Postgres** | Already planned in 1.0; RLS; SQL functions for atomic round claims |
| Auth | **Supabase Auth**: anonymous sign-in (guests) + Google + email magic link | Free 50k MAU; guest → account upgrade keeps the same user id |
| Realtime | **Supabase Realtime**: Broadcast (round events), Presence (online seats) | Free tier fits MVP; no extra service |
| Game server | **Next.js route handlers** (Node runtime) using the service-role key | Engine runs in ms; no long-lived server needed for a turn-based game |
| Deadline sweeper | **pg_cron + pg_net** in Supabase calling `/api/game/tick` every 30 s | Catches rounds where no client triggered the resolve |
| Notifications | Email (Supabase Auth SMTP or Resend free tier) + Web Push (P1) | Async turns |
| OG images | Next.js `opengraph-image` route for Chronicles | Share cards |
| Narrator (optional, D-5) | Templates in MVP; LLM later via the Anthropic TypeScript SDK | Free MVP; LLM only rewrites facts |

### Alternatives considered
| Option | Verdict |
|---|---|
| Colyseus / dedicated game server (Fly.io, Railway) | Better for real-time action; needs an always-on server (cost, ops). Not needed for 60–90 s simultaneous turns. Revisit only if we add real-time phases. |
| PartyKit / Cloudflare Durable Objects | Elegant per-room state; adds a second platform and billing. Keep as plan B if Supabase Realtime limits bite. |
| Supabase Edge Functions for resolve | Works, but Deno runtime means building the engine for two runtimes. Route handlers keep one Node build. |
| Running the engine only on clients | Never: cheating and divergence. Server is the authority; clients only forecast. |

## 2. System overview

```
┌───────────────────────── Browser (each player) ─────────────────────────┐
│ /play/* pages ─ GameStore (Zustand) ─ GlobeCanvas (1.0, game layers)     │
│      │   ▲                     ▲                                          │
│      │   │ HTTP JSON           │ Realtime: broadcast "round.resolved",    │
│      │   │ (state, my orders)  │ "offer.new", presence                    │
│      ▼   │                     │                                          │
│ engine (forecast mode only: budget preview, strike odds)                 │
└──────┬───┴─────────────────────┴──────────────────────────────────────────┘
       │ POST /api/game/...  (Supabase JWT)
┌──────▼──────────────────────── Next.js route handlers ───────────────────┐
│ validate (zod) → authorize (seat owner) → write orders/offers            │
│ resolve: claim round (SQL) → load state → engine.resolveRound()          │
│          → bots decide for bot seats → write results → broadcast         │
│ tick: find overdue rounds → resolve                                      │
└──────┬───────────────────────────────────────────────────────────────────┘
       │ service-role key (server only)
┌──────▼───────────── Supabase ────────────────────────────────────────────┐
│ Postgres: matches, seats, round_states, orders, offers, events, scores,  │
│           ratings, chronicles, daily_crises, profiles  (RLS on all)      │
│ Realtime channels: match:{id}   ·   Auth   ·   pg_cron → /api/game/tick   │
└──────────────────────────────────────────────────────────────────────────┘
```

Rules:
- Clients never write game tables directly; all writes go through route handlers (validation + engine rules). RLS allows **reads** of what a player may see.
- Realtime messages are small notifications (`{type, round}`), never full state. Clients refetch state over HTTP. This keeps messages under free-tier limits and avoids trusting broadcast payloads.
- The engine is versioned (`ENGINE_VERSION`); each match stores the version and seed, so any match can be replayed exactly.

## 3. Round loop

```
            ORDERS phase (deadline T)                          
Player A ── POST /orders ──► upsert orders(match, round, seat) ─► broadcast "seat.submitted"
Player B ── POST /offers ──► insert offer ─► broadcast "offer.new" to channel
Player C ── POST /offers/:id/respond ─► update offer status

Trigger resolve when (all humans submitted) OR (now ≥ T):
   any client ── POST /api/game/matches/:id/resolve ─┐
   pg_cron (30 s) ── POST /api/game/tick ────────────┤
                                                     ▼
   SQL claim_round(match, round): UPDATE matches SET phase='resolving'
        WHERE id=$1 AND round=$2 AND phase='orders'
          AND (phase_ends_at <= now() OR all_submitted) RETURNING *;
        → 0 rows: someone else is resolving → return 202
   load round_states[round], orders, accepted offers, seeds
   bots: decide(seat) for bot/caretaker seats (engine forecast)
   engine.resolveRound(state, orders, offers, rng) → { nextState, events, causes, wire }
   one transaction: insert round_states[round+1], events, update scores, matches.round+1,
                    phase='orders', phase_ends_at=now()+duration (or 'ended')
   after(): broadcast "round.resolved" {round}; send async notifications; LLM wire (D-5)
```

- **Idempotent:** `round_states (match_id, round)` is unique; a retried resolve finds the row and only re-broadcasts.
- **Fast:** resolve is pure CPU (< 50 ms for 10 seats). Vercel function limits are not an issue.
- **Async rooms:** same loop with 12 h deadlines; the cron tick is the usual trigger.
- **Disconnect:** a seat with 2 consecutive empty rounds is flagged `caretaker`; bots play it until the player submits again.

## 4. Engine package

```
lib/game/
  engine/
    index.ts          resolveRound(), forecast(), legalActions(), ENGINE_VERSION
    rules.ts          all tunable numbers (GAME-DESIGN values)
    rng.ts            mulberry32 + hash(matchId, round, actionId)
    state.ts          CountryState, WorldState, PairState types + zod schemas
    phases/
      budget.ts       revenue, spending, debt, rating, interest
      projects.ts     start, progress, complete
      trade.ts        contracts, tariffs, embargoes, world market, prices
      supply.ts       ratios, shortages, reserves
      diplomacy.ts    offers → treaties, trust, relations, call-to-arms
      conflict.ts     strikes, blockade, cyber, front meter, war costs, capitulation
      people.ts       approval, stability, elections
      events.ts       world event deck (P1)
      tension.ts      global tension, brink, catastrophe
      score.ts        composites, Leader Score, titles
    causes.ts         StatChange { field, delta, causeId, label } and chain building
    wire.ts           event → template headline
  bots/
    decide.ts         utility AI, personalities, difficulty
  seed/
    build-seed.ts     data/live + data/curated → data/game/seed-<season>.json
  rating.ts           multiplayer Elo/Glicko update
  types.ts            replaces the draft file
```

Resolution order inside `resolveRound` (fixed, documented, tested):
1. Validate orders against the start-of-round state (illegal → dropped with a reason event).
2. Apply accepted offers and treaties (diplomacy happens first so help arrives before attacks).
3. Domestic orders and budget → treasury.
4. Trade orders → contracts, tariffs, embargoes, sanctions.
5. Military orders, simultaneously (both sides' strikes use start-of-round defenses).
6. Supply and prices → shortages.
7. People (approval, stability), elections on rounds 6 and 12.
8. World event (every 2 rounds, P1).
9. Tension update, catastrophe check.
10. Scores, causes, wire.

Determinism: no `Date.now()`, no `Math.random()`, stable iteration order (sorted ISO3), integer-friendly rounding at each phase. Lint rule bans `Math.random` in `lib/game/engine`.

## 5. Data model (Supabase)

New migration `supabase/migrations/0002_game.sql` replaces the draft `supabase/game_tables.sql`.

```sql
-- people
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,            -- filtered, 3–20 chars
  display_name text not null,
  is_guest boolean not null default true,
  created_at timestamptz default now()
);

-- matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 6 chars, no ambiguous letters
  kind text not null check (kind in ('quick','private','ranked','daily','async')),
  status text not null default 'lobby' check (status in ('lobby','active','ended','abandoned')),
  speed text not null default 'standard', -- blitz | standard | relaxed | async
  max_rounds int not null default 12,
  round int not null default 0,
  phase text not null default 'lobby' check (phase in ('lobby','briefing','orders','resolving','ended')),
  phase_ends_at timestamptz,
  host uuid references profiles,
  engine_version text not null,
  seed bigint not null,
  season text not null,
  tension int not null default 20,
  ended_reason text,                      -- 'term' | 'catastrophe' | 'abandoned'
  created_at timestamptz default now(), started_at timestamptz, ended_at timestamptz
);

create table seats (
  match_id uuid references matches on delete cascade,
  iso3 text not null,
  player_id uuid references profiles,     -- null = bot
  bot_personality text,
  bot_difficulty text,
  state text not null default 'active' check (state in ('active','caretaker','removed','left')),
  ready boolean default false,
  final_rank int, final_score int, titles text[] default '{}',
  primary key (match_id, iso3)
);
create unique index seats_one_per_player on seats (match_id, player_id) where player_id is not null;

-- full world snapshot at the START of each round (jsonb, ~30–60 KB)
create table round_states (
  match_id uuid references matches on delete cascade,
  round int not null,
  world jsonb not null,
  created_at timestamptz default now(),
  primary key (match_id, round)
);

create table orders (
  match_id uuid, round int, iso3 text,
  budget jsonb,                           -- slider values
  decisions jsonb not null default '[]',  -- [{type, target, params}]
  submitted_at timestamptz,
  primary key (match_id, round, iso3),
  foreign key (match_id, iso3) references seats
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches on delete cascade,
  round int not null,
  from_iso3 text not null, to_iso3 text not null,
  kind text not null,                     -- help_military | help_economic | goods | trade | alliance | nap | ceasefire | peace | intel | joint_sanction | call_to_arms
  give jsonb not null default '[]', get jsonb not null default '[]',
  phrase text,                            -- quick phrase id, not free text
  status text not null default 'pending' check (status in ('pending','accepted','declined','countered','expired')),
  parent_id uuid references offers,       -- counter-offer chain
  expires_round int not null,
  responded_at timestamptz
);

create table events (
  id bigserial primary key,
  match_id uuid references matches on delete cascade,
  round int not null,
  seq int not null,                       -- replay order
  type text not null,                     -- strike.city, embargo.energy, offer.accepted, election.won …
  actor text, target text,
  severity text not null,                 -- info | warning | critical | war
  payload jsonb not null,                 -- numbers, city, hits, casualties range
  deltas jsonb not null,                  -- [{iso3, field, delta, causeId}]
  headline text not null,                 -- template wire
  headline_llm text                       -- optional rewrite (D-5)
);

create table chronicles (
  match_id uuid primary key references matches on delete cascade,
  lead jsonb not null, stories jsonb not null, timeline jsonb not null, standings jsonb not null,
  public boolean not null default true,
  created_at timestamptz default now()
);

-- ranking
create table ratings (
  player_id uuid references profiles, season text,
  rating int not null default 1000, rd int not null default 350,
  matches int not null default 0, wins int not null default 0, peak int not null default 1000,
  primary key (player_id, season)
);
create table country_bests (                -- "Best leaders of China"
  season text, iso3 text, player_id uuid references profiles,
  best_score int not null, match_id uuid references matches,
  primary key (season, iso3, player_id)
);
create table daily_crises (
  day date primary key, iso3 text not null, seed bigint not null, scenario jsonb not null
);
create table daily_results (
  day date references daily_crises, player_id uuid references profiles,
  score int not null, match_id uuid references matches,
  primary key (day, player_id)
);
create table reports (                      -- moderation
  id bigserial primary key, reporter uuid, reported uuid, match_id uuid, reason text, created_at timestamptz default now()
);
```

### 5.1 Row-level security
| Table | Read | Write |
|---|---|---|
| matches, seats | anyone in the match; public summary for ended matches | server only |
| round_states | match members; **redacted view** `round_state_public(match, round)` hides other seats' exact force numbers unless intel sharing | server only |
| orders | own seat only until the round is resolved; all after match end | server only (API validates) |
| offers | sender and receiver; all members after expiry/resolution | server only |
| events, chronicles | match members; public after match end | server only |
| ratings, country_bests, daily_results, profiles (public fields) | everyone | server only |

The service-role key is used only in route handlers (`server-only` import), never shipped to the client (1.0 rule).

### 5.2 Storage size
~45 KB state × 13 snapshots + ~150 events ≈ 0.7 MB per match. Free tier 500 MB ≈ 700 matches kept in full. Plan: after 30 days keep only round 0, final state, events and Chronicle (≈ 0.15 MB) → ~3,000+ matches; move older full snapshots to Supabase Storage as gzip JSON if needed.

## 6. API (route handlers under `app/api/game/`)

| Method & path | Who | Does |
|---|---|---|
| `POST /api/game/rooms` | signed-in or guest | create room `{kind, speed, ranked}` → `{code, matchId}` |
| `POST /api/game/rooms/:code/join` | user | take a free seat or spectate |
| `POST /api/game/quick` | user | find or create Quick Match |
| `POST /api/game/matches/:id/seat` | user | pick/change country in lobby |
| `POST /api/game/matches/:id/ready` · `/start` | user · host | ready toggle; start (bots fill) |
| `GET /api/game/matches/:id/state?round=` | member | redacted world state + my orders + my offers + events of last round |
| `PUT /api/game/matches/:id/orders` | seat owner | upsert budget + decisions (engine `legalActions` validation) |
| `POST /api/game/matches/:id/offers` | seat owner | send offer (validated terms) |
| `POST /api/game/offers/:id/respond` | receiver | accept / decline / counter |
| `POST /api/game/matches/:id/resolve` | member | try to resolve (claim) |
| `POST /api/game/tick` | pg_cron (secret header) | resolve overdue rounds, expire lobbies |
| `GET /api/game/matches/:id/chronicle` | public after end | Chronicle JSON |
| `GET /api/game/leaderboard?scope=` | public | leaderboards (cached 60 s) |
| `GET /api/game/daily` · `POST /api/game/daily/start` | user | today's crisis |
| `POST /api/game/report` | user | report a player |

Every response: `{ data, round, phase, phaseEndsAt, serverTime }` so clients compute timers from server time, not their own clock.

Rate limits: orders/offers ≤ 20 writes per seat per round; offers ≤ 3 pending per sender per receiver.

## 7. Client architecture

```
app/play/layout.tsx              shared providers, header with Play item
app/play/page.tsx                Hub
app/play/room/[code]/page.tsx    Lobby
app/play/match/[id]/page.tsx     <MatchExperience/>
app/play/match/[id]/results/     Results + Chronicle (+ opengraph-image)
└─ MatchExperience
   ├─ GlobeCanvas (1.0, mounted once) + game layers: StatusFill, SeatPins, ContractFlows,
   │    SanctionArcs, StrikeArcs, BlockadeRings, FrontMarkers, OfferArcs
   ├─ TopBar (PhaseTimer, TensionMeter)
   ├─ CabinetCard · TargetPanel · OrderTray · CategoryDock · InboxWire
   ├─ BudgetSheet · ProjectGrid · OfferBuilder · OfferModal · StrikePlanner
   ├─ ReplayDirector (owns camera during replay)
   └─ CauseChain popover host
components/game/*                game UI;  components/globe/layers/game/*  game layers
lib/game/client/useMatch.ts      TanStack Query (state) + Supabase channel (notifications)
lib/game/client/store.ts         Zustand: selection, draft orders, replay queue, UI sheets
```

- 1.0's `useAppStore` stays for Explore; the game has its own store so modes never collide. The globe reads a `scene` value (`explore | game`) to choose layers.
- Draft orders live in the client store and are saved to the server on every change (debounced 500 ms), so a refresh never loses them.
- Forecast: `engine.forecast(state, draftOrders)` runs in a Web Worker to keep 60 fps while dragging sliders.

## 8. Narrator (D-5)

MVP: `wire.ts` templates (free, instant, deterministic).

Optional LLM pass, in `after()` once a round is committed (never blocks the game):
- One request per round with that round's events as structured facts; returns `{eventId, headline}[]` via structured outputs; one request per match for the Chronicle lead story.
- The prompt forbids adding facts, numbers, names of real politicians or judgement adjectives; output is validated (numbers must match the facts) and falls back to the template on any mismatch.
- Model (owner's choice): default `claude-opus-5-5`; `claude-haiku-5-5` as the low-cost option. Cost per 12-round match with ~1.5k input / ~0.8k output tokens per round plus a Chronicle call: **≈ $0.30 on Opus 5.5** ($4 / $20 per million tokens), **≈ $0.01 on Haiku 5.5** ($0.10 / $0.50). Prices as of 2026-10; check before enabling. Opus 5.5 always thinks, so run it at `effort: "low"` and expect some extra output tokens on top of this estimate.
- Uses the official `@anthropic-ai/sdk` from a server route only; key in server env.

## 9. Security and fair play

| Threat | Control |
|---|---|
| Seeing others' orders | Orders readable only by owner until resolved (RLS + API) |
| Forged actions | Server validates every decision with `legalActions(state, seat)`; treasury and slots checked server-side |
| Timer cheating | Server time only; late orders rejected |
| Double resolve / race | Atomic `claim_round` update; unique `(match_id, round)` |
| Multi-accounting in ranked | One seat per user per match; ranked needs a non-guest account; rating gains damped for repeat same-group matches (P1) |
| Abuse | Name filter, quick phrases only, report/mute, host kick in private rooms |
| Secret leakage | Service key server-only (`server-only`), pg_cron uses a separate shared secret header |

## 10. Testing

| Level | What |
|---|---|
| Unit (Vitest) | Every engine phase; golden tests for the GAME-DESIGN examples (embargo chain, strike odds, front meter, elections, scoring) |
| Determinism | Same seed + orders → byte-identical next state (run twice, compare hash) |
| Property tests | No NaN/negative goods; indices stay 0–100; treasury identity holds each round |
| Self-play balance | `npm run game:selfplay -- --matches 10000` in CI on engine changes; fails if per-country score spread > ±10 % or catastrophe rate > 5 % |
| API | Route handler tests with a local Supabase (CLI) for claim/resolve idempotency and RLS |
| E2E (Playwright) | 3 browser contexts play a Blitz match to the end; reconnect mid-round; async turn notification |
| Accessibility | axe on hub, lobby, HUD, Chronicle (1.0 setup) |

## 11. Cost

| Item | MVP (≤ 2,000 matches/month) | Growth (~20,000 matches/month) |
|---|---|---|
| Vercel | Hobby $0 (non-commercial only) | Pro ~$20/month (required as soon as we take payments) |
| Supabase | Free $0 — ~200 concurrent realtime connections (~20 full matches at once), ~2 M messages/month, 500 MB DB, 50k MAU; free projects pause after ~7 days idle (ingest cron keeps it active) | Pro ~$25/month + usage |
| Realtime messages per match | ~10 clients × (12 rounds × ~6 notifications + presence) ≈ 1,000 | 20 M/month → Pro tier |
| Email | Supabase built-in / Resend free tier | Resend paid if > free quota |
| Narrator | Templates $0 | Opus 5.5 ≈ $6,000/month or Haiku 5.5 ≈ $150/month at 20k matches — only if D-5 enables it |
| Payments (G8) | — | Gateway fees only (Razorpay / Stripe, % per transaction) |

Free-tier figures come from Supabase's and Vercel's published plans as reported in 2026; confirm on their pricing pages before launch.

## 12. Reuse map (1.0 → game)

| 1.0 piece | Game use |
|---|---|
| `components/globe/*` (GlobeCanvas, CameraRig, DataOverlay, Borders, MarkerProjector) | Shared world view, fly-tos, status fills, pins |
| `layers/TradeLayer`, `SanctionsLayer`, `WarsLayer`, `RelationsLayer` | Contracts, sanctions, strikes, alliances |
| `components/chrome/ModeDock`, `PanelHost`, `Flag`, `Sparkline`, `MapControls` | Category dock, target panel, flags, trends |
| `components/bits/*` | CountUp, AnimatedList, BlurText, SplitText, ShinyText |
| `components/learn/Term` (glossary chips) | Cause chain "learn" links |
| `lib/capability.ts`, `lib/relations.ts`, `lib/energy.ts`, `lib/diplomacy.ts`, `data/*` | Seeding |
| `lib/camera/fly.ts`, `lib/perf.ts` | Replay camera, device tiers |
