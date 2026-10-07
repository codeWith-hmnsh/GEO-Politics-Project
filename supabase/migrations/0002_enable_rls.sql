-- Lock every table to the server: Row Level Security on, and no policies.
-- Only the secret / service-role key (used by ingest jobs and API routes) can read or write;
-- the public anon / publishable key gets nothing. Run after 0001_init.sql.

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
