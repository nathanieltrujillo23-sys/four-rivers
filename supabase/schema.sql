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
  -- Set once the 50-question final exam is passed (>= 35/50). The
  -- certificate stays locked until then — see 004_final_exam.sql.
  exam_passed_at timestamptz,
  exam_best_score int check (exam_best_score between 0 and 50),
  -- Set when a learner opts into the 30-Day Challenge (see
  -- 008_challenge.sql). Everything else about the challenge — current day,
  -- task completion, streak — is derived from existing data, not stored.
  challenge_started_at timestamptz,
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
  -- Set once a river's quiz has been passed (score >= 7/10). Advancing to the
  -- next river requires this in addition to completed_at — see 003_quizzes.sql.
  quiz_passed_at timestamptz,
  quiz_best_score int check (quiz_best_score between 0 and 10),
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
-- Certificate verification — narrow public-readable projection
-- ------------------------------------------------------------------ --
-- Lets a certificate's "verify this" link work for someone who isn't signed
-- in, without exposing the rest of `profiles`. Kept in sync whenever an exam
-- result is recorded. See 005_certificate_verification.sql for existing
-- projects.
create table certificate_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  completed_at timestamptz,
  exam_passed_at timestamptz not null,
  exam_best_score int not null check (exam_best_score between 0 and 50),
  updated_at timestamptz not null default now()
);

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
alter table certificate_verifications enable row level security;

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

create policy "Anyone can verify a certificate"
  on certificate_verifications for select
  using (true);
create policy "Users manage their own certificate verification row"
  on certificate_verifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

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
-- Module-read tracking (also shipped alone as supabase/006_module_views.sql)
-- ------------------------------------------------------------------ --
-- One row per (user, section, module_index) viewed — ledger integrity again:
-- counts are derived by querying, never stored as a running total.
create table module_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('introduction', '1', '2', '3', '4')),
  module_index int not null check (module_index >= 0),
  viewed_at timestamptz not null default now(),
  primary key (user_id, section, module_index)
);

create index idx_module_views_user on module_views (user_id);

alter table module_views enable row level security;

create policy "Users manage their own module views"
  on module_views for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------------ --
-- Content overrides (also shipped alone as supabase/007_content_overrides.sql)
-- ------------------------------------------------------------------ --
-- Lets an admin edit any module's text from the Admin page. id =
-- "<section>:<moduleIndex>" (e.g. "introduction:0", "1:3"); content is the
-- full module JSON. No row = the static default in src/content/lessons/ is
-- used, so this is purely additive over the code-shipped content.
create table content_overrides (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table content_overrides enable row level security;

create policy "Signed-in users can read content overrides"
  on content_overrides for select
  using (auth.role() = 'authenticated');

create policy "Admins manage content overrides"
  on content_overrides for all
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));

