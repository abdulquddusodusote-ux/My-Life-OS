-- Meniscus OS — Database Schema & Row Level Security (Postgres / Supabase)
-- Copy and run this script in the Supabase SQL Editor

-- 1. Daily Rhythm Items
create table if not exists rhythm_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  duration_label text,
  sort_order int not null default 0,
  active boolean not null default true
);

-- 2. Daily Rhythm Logs (1 log per user per day per item)
create table if not exists rhythm_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  item_id uuid not null references rhythm_items(id) on delete cascade,
  completed boolean not null default false,
  unique (user_id, log_date, item_id)
);

-- 3. Weekly Pool Items
create table if not exists pool_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_per_week int not null,
  session_label text,
  sort_order int not null default 0,
  active boolean not null default true
);

-- 4. Weekly Pool Logs (count per user per week_start per item)
create table if not exists pool_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  item_id uuid not null references pool_items(id) on delete cascade,
  count int not null default 0,
  unique (user_id, week_start, item_id)
);

-- 5. Calendar One-off Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 6. Recurring Events (weekly or monthly)
create table if not exists recurring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  rule_type text not null check (rule_type in ('weekly', 'monthly')),
  weekday int check (weekday between 0 and 6),       -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  day_of_month int check (day_of_month between 1 and 31)
);

-- 7. Quick-Capture Inbox
create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  processed boolean not null default false
);

-- 8. Focus Timer Sessions
create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_type text check (linked_type in ('rhythm', 'pool')),
  linked_item_id uuid,
  duration_seconds int not null,
  completed_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table rhythm_items enable row level security;
alter table rhythm_logs enable row level security;
alter table pool_items enable row level security;
alter table pool_logs enable row level security;
alter table events enable row level security;
alter table recurring_events enable row level security;
alter table inbox_items enable row level security;
alter table focus_sessions enable row level security;

-- Create single-user access policies (auth.uid() = user_id)
create policy "owner full access rhythm_items" on rhythm_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access rhythm_logs" on rhythm_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access pool_items" on pool_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access pool_logs" on pool_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access events" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access recurring_events" on recurring_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access inbox_items" on inbox_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner full access focus_sessions" on focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
