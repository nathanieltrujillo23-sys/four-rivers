-- 4 Rivers — migration 002: financial journal
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups). Safe to run once; re-running errors on
-- "already exists", which is harmless.

create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null check (length(btrim(body)) > 0),
  entry_date date not null default current_date,
  river_number int check (river_number between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_journal_entries_user
  on journal_entries (user_id, entry_date desc, created_at desc);

alter table journal_entries enable row level security;

create policy "Users manage their own journal entries"
  on journal_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
