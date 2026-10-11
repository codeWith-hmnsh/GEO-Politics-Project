# Statecraft 3.0 — Architecture Changes

Adds the interpreter and the proposal system to the 2.0 architecture ([2.0 ARCHITECTURE](../docs2.0/ARCHITECTURE.md)). The stack, the round loop, Supabase, realtime and the engine package stay.

## 1. Pipeline

```
Client order bar
   │  POST /api/game/interpret   { matchId, text }
   ▼
Interpreter (route handler, server only)
   │  Claude API call with a strict output schema
   ▼
Schema check (zod)  ──fail──▶  { result: "ask" } with the raw fields
   │
   ▼
Validator (lib/game/engine/validate.ts, pure)
   │
   ▼
Forecast (lib/game/engine, same functions as resolve, single-actor)
   │
   ▼
Client shows the card ── Confirm ──▶ POST /api/game/orders  (plain card JSON)
                                         │
                                  round lock ▶ resolve (2.0, unchanged)
```

- The interpreter lives only on the server. The API key never reaches the client.
- Chips and the composer skip the interpreter and call the validator and forecast directly through `POST /api/game/preview`.
- Resolve and replay read confirmed cards from the database. They never call the AI, so results stay deterministic and replayable.

## 2. Engine package additions

```
lib/game/engine/
  vocabulary.ts     verbs, parameter schemas, cost formulas, cause templates
  validate.ts       feasibility checks (treasury, capacity, real flows, treaties)
  forecast.ts       runs resolve for one actor with others frozen
  treaties.ts       term checks at resolve, onBreak penalties, reliability
lib/game/interpret/
  schema.ts         zod schema for the interpreter output (cards | ask | unsupported | refused)
  prompt.ts         system prompt built from vocabulary.ts and the match context
  client.ts         Anthropic SDK call, timeout, retry once, fallback
```

`vocabulary.ts` is the single source for both the engine and the interpreter prompt, so a new verb is added in one place.

## 3. Interpreter call

- SDK: Anthropic TypeScript SDK (`@anthropic-ai/sdk`), server side.
- Output: forced structured output matching `schema.ts`; the response is parsed and checked with zod before use.
- Input per call: system prompt with the vocabulary (cached with prompt caching, it is the same for every call in a match), the match context (countries, current prices, active treaties, last round's headline) and the player's text.
- Timeout 4 seconds. On timeout or error, return `ask` with the chips so the player can finish the card by hand.
- Language: English, Hindi (Devanagari) and Hinglish in; card labels always in the UI language.
- The prompt states the rules: copy only numbers the player wrote; never output consequences; return `ask` instead of guessing; return `refused` for content-rule breaks.

## 4. Data model additions (Supabase)

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  round int not null,
  seat text not null,
  slot smallint not null check (slot between 1 and 3),
  card jsonb not null,             -- OrderCard
  source text not null check (source in ('chip','composer','text')),
  raw_text text,                   -- the player's words, if any
  created_at timestamptz default now(),
  unique (match_id, round, seat, slot)
);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  round int not null,
  from_seat text not null,
  to_seat text not null,
  body jsonb not null,             -- Proposal without status
  parent_id uuid references proposals(id),
  status text not null default 'sent',
  visibility text not null default 'private'
);

create table treaties (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  proposal_id uuid not null references proposals(id),
  starts_round int not null,
  ends_round int not null,
  broken_round int,
  broken_by text
);

create table wish_list (
  id bigint generated always as identity primary key,
  text_hash text not null,
  text_anon text not null,         -- names of players removed
  closest_verbs text[] not null,
  created_at timestamptz default now()
);
```

Row-level security follows 2.0 §5.1: a player reads their own orders and proposals sent to or from their seat; public items are readable by everyone in the match; only the server writes treaties.

## 5. APIs (route handlers under `app/api/game/`)

| Route | Method | Purpose |
|---|---|---|
| `interpret` | POST | Text to cards / ask / unsupported / refused, with validation and forecast |
| `preview` | POST | Card (from chips or composer) to validation and forecast |
| `orders` | POST, DELETE | Confirm or withdraw a card in a slot |
| `proposals` | POST | Send a proposal or counter |
| `proposals/[id]` | PATCH | Accept or reject |

Read `node_modules/next/dist/docs/` for route handler conventions before writing them (Next.js 16).

## 6. Rate limits and abuse

- `interpret`: 6 calls per player per round, 60 per match. Beyond that, chips and composer only.
- Text length: 280 characters.
- `STATEMENT` text and proposal free text pass a moderation step (the same interpreter call returns `refused` for abuse).
- Logs keep `raw_text` for 30 days for dispute review, then keep only the card.

## 7. Testing

- Golden set: 200 sentences (English, Hindi, Hinglish) with expected cards, run against the chosen model before each prompt change. Pass bar: 90% exact verb and target, 100% no invented consequence numbers.
- Engine tests from 2.0 cover validate, forecast and treaties as pure functions.
- A fake interpreter (rule-based) is used in end-to-end tests so they do not call the API.

## 8. Cost

Estimate per interpret call: about 2,000 input tokens (most of it cached) and about 300 output tokens. Prices as listed in 2.0 ARCHITECTURE §8 (as of 2026-10; check before launch).

| Model | Per call | Per match (4 players × 8 rounds × ~2 calls) | 20,000 matches / month |
|---|---|---|---|
| `claude-haiku-5-5` | ≈ $0.0004 | ≈ $0.03 | ≈ $600 |
| `claude-opus-5-5` (effort low) | ≈ $0.02 | ≈ $1.30 | ≈ $26,000 |

Recommendation (E-1): build and playtest with Haiku 5.5; switch to Opus 5.5 only for the parts of the golden set Haiku fails, or as a paid "Advisor" feature. Prompt caching lowers the input share further.
