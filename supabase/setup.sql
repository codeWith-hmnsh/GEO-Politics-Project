-- One-shot setup for a NEW Supabase project: paste all of this into the SQL Editor and press Run.
-- 1) Removes tables from any earlier attempt (they must be empty; a new project has no data).
-- 2) Creates the schema (0001_init.sql). 3) Locks every table to the server key (0002_enable_rls.sql).

drop table if exists strikes, relations_baseline, bilateral_trade, external_creditors, un_voting_alignment cascade;
drop table if exists news_items, news_clusters, strike_reports, summits, organizations, conflicts, countries, indicators, trade_partners, arms_transfers, creditors, relations, snapshots, change_log cascade;

create table if not exists countries (
  iso3 text primary key,
  iso2 text,
  name text not null,
  capital text,
  lat double precision,
  lng double precision,
  region text,
  population bigint,
  head_of_state text,
  head_of_gov text,
  gov_type text,
  updated_at timestamptz not null default now()
);

create table if not exists news_clusters (
  id bigserial primary key,
  title text not null,
  sections text[] not null default '{}',
  countries text[] not null default '{}',
  lat double precision,
  lng double precision,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  source_count int not null default 1,
  top_item_id bigint,
  score double precision not null default 0
);

create table if not exists news_items (
  id bigserial primary key,
  cluster_id bigint references news_clusters(id) on delete set null,
  url text not null unique,
  title text not null,
  source_domain text not null,
  source_tier smallint not null check (source_tier between 1 and 3),
  published_at timestamptz not null,
  sections text[] not null default '{}',
  countries text[] not null default '{}',
  lat double precision,
  lng double precision,
  tone double precision,
  lang text not null default 'en',
  fetched_at timestamptz not null default now()
);
create index if not exists news_items_published_idx on news_items (published_at desc);
create index if not exists news_items_sections_idx on news_items using gin (sections);
create index if not exists news_items_countries_idx on news_items using gin (countries);

create table if not exists conflicts (
  id text primary key,
  name text not null,
  parties text[] not null default '{}',
  start_date date,
  type text,
  status text not null check (status in ('active', 'escalating', 'ceasefire', 'frozen')),
  intensity_tier smallint not null check (intensity_tier between 1 and 3),
  centroid_lat double precision not null,
  centroid_lng double precision not null,
  why_it_matters text[] not null default '{}',
  tour_id text,
  casualty_estimate text,
  casualty_source text,
  reviewed_at timestamptz
);

create table if not exists strike_reports (
  id bigserial primary key,
  conflict_id text references conflicts(id) on delete cascade,
  origin_iso3 text,
  origin_lat double precision,
  origin_lng double precision,
  target_lat double precision not null,
  target_lng double precision not null,
  reported_at timestamptz not null,
  cluster_id bigint references news_clusters(id) on delete set null,
  expires_at timestamptz not null
);

create table if not exists organizations (
  id text primary key,
  name text not null,
  glyph text,
  colour text,
  pin_lat double precision,
  pin_lng double precision,
  hq text,
  purpose text,
  members text[] not null default '{}'
);

create table if not exists summits (
  id text primary key,
  org_id text references organizations(id),
  name text not null,
  city text,
  lat double precision,
  lng double precision,
  starts_on date,
  ends_on date,
  agenda text[] not null default '{}'
);

create table if not exists indicators (
  iso3 text not null,
  code text not null,
  year int not null,
  value double precision,
  source text not null,
  as_of date,
  primary key (iso3, code, year)
);

create table if not exists trade_partners (
  reporter text not null,
  partner text not null,
  flow char(1) not null check (flow in ('X', 'M')),
  year int not null,
  value_usd double precision,
  hs_code text not null default 'TOTAL',
  primary key (reporter, partner, flow, year, hs_code)
);

create table if not exists arms_transfers (
  supplier text not null,
  recipient text not null,
  year int not null,
  tiv double precision,
  primary key (supplier, recipient, year)
);

create table if not exists creditors (
  debtor text not null,
  creditor text not null,
  year int not null,
  value_usd double precision,
  primary key (debtor, creditor, year)
);

create table if not exists relations (
  a_iso3 text not null,
  b_iso3 text not null,
  status text not null check (status in ('ally', 'hostile', 'neutral', 'mixed')),
  score double precision,
  components jsonb,
  basis text,
  source text not null check (source in ('computed', 'curated')),
  reviewed_at timestamptz,
  primary key (a_iso3, b_iso3)
);

create table if not exists snapshots (
  key text primary key,
  payload jsonb not null,
  as_of timestamptz not null default now()
);

create table if not exists change_log (
  id bigserial primary key,
  entity text not null,
  entity_id text not null,
  field text not null,
  old jsonb,
  new jsonb,
  changed_at timestamptz not null default now()
);


alter table countries        enable row level security;
alter table news_clusters    enable row level security;
alter table news_items       enable row level security;
alter table conflicts        enable row level security;
alter table strike_reports   enable row level security;
alter table organizations    enable row level security;
alter table summits          enable row level security;
alter table indicators       enable row level security;
alter table trade_partners   enable row level security;
alter table arms_transfers   enable row level security;
alter table creditors        enable row level security;
alter table relations        enable row level security;
alter table snapshots        enable row level security;
alter table change_log       enable row level security;
