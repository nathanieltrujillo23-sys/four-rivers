-- 4 Rivers — core schema
-- Run this in the Supabase SQL editor after creating a NEW, dedicated project
-- (this app does not share a Supabase instance with any other project).
--
-- Design rule carried over from prior builds: LEDGER INTEGRITY.
-- Every tracker entry is a real row here. Summary/dashboard numbers are always
-- derived by summing these rows at read time — never stored as a running total.

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------ --
-- Profiles / roles
-- ------------------------------------------------------------------ --
-- Role model: 'free' (default for every signed-in user) or 'admin'.
-- "Guest" is simply the absence of a session and has no row.
-- A future 'paid' tier would be added to this check constraint.
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'free' check (role in ('free', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------------ --
-- Course progress: one row per (user, river)
-- ------------------------------------------------------------------ --
-- Only lesson_viewed_at and completed_at are stored. Status
-- (not_started / in_progress / complete) is DERIVED in the client from these
-- two columns plus a count of the river's ledger rows.
create table course_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  river_number int not null check (river_number between 1 and 4),
  lesson_viewed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, river_number)
);

create index idx_course_progress_user on course_progress (user_id);

-- ------------------------------------------------------------------ --
-- River 1 — Multiple Streams of Income
-- ------------------------------------------------------------------ --
create table income_streams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  amount numeric(12,2) not null check (amount >= 0),
  cadence text not null default 'monthly'
    check (cadence in ('one_time','weekly','biweekly','monthly','quarterly','annually')),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_income_streams_user on income_streams (user_id, created_at desc);

-- ------------------------------------------------------------------ --
-- River 2 — Saving (goal + contribution ledger; balance = sum of contributions)
-- ------------------------------------------------------------------ --
create table savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount >= 0),
  created_at timestamptz not null default now()
);

create index idx_savings_goals_user on savings_goals (user_id, created_at desc);

create table savings_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references savings_goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount <> 0),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_savings_contributions_user on savings_contributions (user_id, created_at desc);
create index idx_savings_contributions_goal on savings_contributions (goal_id);

-- ------------------------------------------------------------------ --
-- River 3 — Investing (contribution log only; NOT valuation / market data)
-- ------------------------------------------------------------------ --
create table investment_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contribution_amount numeric(12,2) not null check (contribution_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_investment_entries_user on investment_entries (user_id, created_at desc);

-- ------------------------------------------------------------------ --
-- River 4 — Giving
-- ------------------------------------------------------------------ --
create table giving_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  amount numeric(12,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_giving_entries_user on giving_entries (user_id, created_at desc);

-- ------------------------------------------------------------------ --
-- Row level security — every table scoped to its owning user
-- ------------------------------------------------------------------ --
alter table profiles enable row level security;
alter table course_progress enable row level security;
alter table income_streams enable row level security;
alter table savings_goals enable row level security;
alter table savings_contributions enable row level security;
alter table investment_entries enable row level security;
alter table giving_entries enable row level security;

create policy "Users read their own profile"
  on profiles for select using (user_id = auth.uid());
create policy "Users update their own profile"
  on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own course progress"
  on course_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own income streams"
  on income_streams for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own savings goals"
  on savings_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own savings contributions"
  on savings_contributions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own investment entries"
  on investment_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own giving entries"
  on giving_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------------ --
-- Journal (also shipped alone as supabase/002_journal.sql for existing projects)
-- ------------------------------------------------------------------ --
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

-- ------------------------------------------------------------------ --
-- OPTIONAL / FUTURE: lessons table for admin-managed content.
-- v1 ships lesson content as static data in src/content/lessons.ts. When
-- content editing moves into the app, create this table, seed it from that
-- file, and switch the repository's lesson read to Supabase.
-- ------------------------------------------------------------------ --
-- create table lessons (
--   river_number int primary key check (river_number between 1 and 4),
--   content jsonb not null,        -- { title, intro, sections, practicePrompt }
--   scripture_refs jsonb not null, -- [{ reference, text, translation }]
--   updated_at timestamptz not null default now()
-- );
-- alter table lessons enable row level security;
-- create policy "Anyone signed in can read lessons"
--   on lessons for select using (auth.role() = 'authenticated');
-- create policy "Admins manage lessons"
--   on lessons for all
--   using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
--   with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));

