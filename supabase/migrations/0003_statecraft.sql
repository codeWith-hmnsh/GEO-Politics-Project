-- Statecraft multiplayer tables (docs4.0/MULTIPLAYER.md §5). Paste into the Supabase SQL Editor and press Run.
-- Safe to run more than once. It does not touch the GeoPolitics 1.0 tables.
--
-- Security model: every table has RLS on and NO policies, so the browser keys cannot read or write them.
-- All reads and writes go through the app's route handlers with the server key, which hide other
-- leaders' orders until a turn resolves. Live updates use Realtime Broadcast notifications only.

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists game_matches (
  id uuid primary key default gen_random_uuid(),
  code text unique,                         -- 5-character room code (no O/0/I/1)
  mode text not null default 'room' check (mode in ('room', 'quick')),
  host uuid,                                -- auth user id of the host
  scenario text not null,
  difficulty text not null default 'normal',
  seed bigint not null,
  engine_version text not null,
  turn int not null default 0,              -- 0 = lobby
  phase text not null default 'lobby' check (phase in ('lobby', 'plan', 'resolving', 'ended')),
  turn_seconds int not null default 90,
  deadline_at timestamptz,
  state jsonb,                              -- current WorldState (server only)
  plan jsonb,                               -- bot orders and bot proposals for the current turn (server only)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists game_seats (
  match_id uuid not null references game_matches(id) on delete cascade,
  iso3 text not null check (iso3 in ('CHN', 'IND', 'JPN', 'RUS', 'SAU', 'USA')),
  user_id uuid,                             -- null for bots
  kind text not null default 'bot' check (kind in ('human', 'bot', 'caretaker')),
  leader_name text not null default '',
  portrait int not null default 0,
  locked boolean not null default false,
  ready boolean not null default false,
  empty_turns int not null default 0,       -- turns in a row without orders; 2 makes the seat a caretaker
  last_seen timestamptz not null default now(),
  primary key (match_id, iso3)
);
create unique index if not exists game_seats_one_seat_per_user on game_seats (match_id, user_id) where user_id is not null;

create table if not exists game_orders (
  match_id uuid not null references game_matches(id) on delete cascade,
  turn int not null,
  iso3 text not null,
  orders jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (match_id, turn, iso3)
);

create table if not exists game_proposals (
  id text primary key,
  match_id uuid not null references game_matches(id) on delete cascade,
  turn int not null,
  from_iso3 text not null,
  to_iso3 text not null,
  body jsonb not null,                      -- the Proposal (gives, wants, turns, parentId)
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'countered', 'expired')),
  created_at timestamptz not null default now()
);
create index if not exists game_proposals_match_turn on game_proposals (match_id, turn);

create table if not exists game_turns (
  match_id uuid not null references game_matches(id) on delete cascade,
  turn int not null,
  record jsonb not null,                    -- TurnRecord: moves, news, causes, globe events
  created_at timestamptz not null default now(),
  primary key (match_id, turn)
);

create table if not exists game_results (
  match_id uuid not null references game_matches(id) on delete cascade,
  iso3 text not null,
  user_id uuid,
  score int not null,
  power_rank int not null,
  won boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (match_id, iso3)
);

alter table game_matches enable row level security;
alter table game_seats enable row level security;
alter table game_orders enable row level security;
alter table game_proposals enable row level security;
alter table game_turns enable row level security;
alter table game_results enable row level security;

-- Only one caller may resolve a turn: moves the match from 'plan' to 'resolving' when every human has
-- locked or the deadline has passed. Returns the match row, or nothing if someone else got there first.
create or replace function game_claim_turn(p_match uuid, p_turn int)
returns setof game_matches
language sql
as $$
  update game_matches m
     set phase = 'resolving', updated_at = now()
   where m.id = p_match
     and m.turn = p_turn
     and m.phase = 'plan'
     and (
       m.deadline_at <= now()
       or not exists (
         select 1 from game_seats s
          where s.match_id = m.id and s.kind = 'human' and not s.locked
       )
     )
  returning m.*;
$$;

revoke all on function game_claim_turn(uuid, int) from public, anon, authenticated;

-- Old finished matches keep only results (MULTIPLAYER §5). Runs daily at 03:00 UTC.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'statecraft-prune';
    perform cron.schedule(
      'statecraft-prune',
      '0 3 * * *',
      $job$
        update game_matches set state = null, plan = null
         where ended_at < now() - interval '30 days' and state is not null;
        delete from game_turns t using game_matches m
         where t.match_id = m.id and m.ended_at < now() - interval '30 days';
        delete from game_matches where phase = 'lobby' and created_at < now() - interval '1 day';
      $job$
    );
  end if;
end $$;

-- After deploying, a backup "tick" can resolve overdue turns even if every player has left
-- (MULTIPLAYER §4.1). Replace the URL with the deployed site, then run this block once:
-- select cron.schedule('statecraft-tick', '30 seconds',
--   $$ select net.http_post(url := 'https://YOUR-SITE/api/game/tick', headers := '{"content-type":"application/json"}'::jsonb, body := '{}'::jsonb) $$);
