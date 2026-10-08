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
  -- Name printed on the certificate (display_name is the preferred name shown
  -- in greetings) — see 009_full_name.sql.
  full_name text,
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
-- Journal (also shipped alone as supabase/legacy/002_journal.sql for existing projects)
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
-- Module-read tracking (also shipped alone as supabase/legacy/006_module_views.sql)
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
-- Content overrides (also shipped alone as supabase/legacy/007_content_overrides.sql)
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


-- ------------------------------------------------------------------ --
-- Community: leader status, groups, chat, prayer wall, admin dashboard
-- (also shipped alone as supabase/legacy/011_community.sql, which is the safe one to
-- run on an existing project; this copy keeps fresh setups in one file)
-- ------------------------------------------------------------------ --
-- 4 Rivers — migration 011: Community (replaces 010)
-- Run this once in the Supabase SQL editor. It is self-contained and safe to
-- run whether or not 010_groups.sql was ever run, and safe to re-run.
--
-- What it adds:
--   * Leader status: any learner can ask to lead a group; only an admin can
--     approve. Only approved leaders (and admins) can create a group.
--   * Groups with a 4-digit join code, a leader-set "verse of the day", a
--     member chat (live via Supabase Realtime), and a prayer wall with
--     optional anonymity.
--   * Admin-only functions that power the admin dashboard.
--   * A guard so nobody can promote themselves: the `role` and `leader_status`
--     columns on profiles can no longer be changed through the public API by a
--     non-admin (previously a learner could have edited their own `role`).
--
-- Privacy: nobody can read another person's progress, notes, or results. A
-- group only ever shows its member names, the chat, and the prayer wall. A
-- prayer posted anonymously is stored with its author for moderation but the
-- name is never returned to anyone else, leaders included.

-- ------------------------------------------------------------------ --
-- Profiles: leader status
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists leader_status text not null default 'none'
    check (leader_status in ('none', 'requested', 'approved')),
  add column if not exists leader_requested_at timestamptz,
  add column if not exists leader_note text;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'admin');
$$;

-- Role and leader status may only change through the admin functions below
-- (or from the SQL editor, where there is no signed-in user).
create or replace function protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'not allowed';
    end if;
    if new.leader_status is distinct from old.leader_status
       and coalesce(current_setting('app.leader_rpc', true), '') <> 'on' then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on profiles;
create trigger profiles_protect_privileges
  before update on profiles
  for each row execute function protect_profile_privileges();

create or replace function request_leader(p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  perform set_config('app.leader_rpc', 'on', true);
  update profiles
    set leader_status = 'requested',
        leader_requested_at = now(),
        leader_note = left(trim(coalesce(p_note, '')), 300)
    where user_id = auth.uid() and leader_status = 'none';
end;
$$;

create or replace function admin_set_leader(p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  perform set_config('app.leader_rpc', 'on', true);
  update profiles
    set leader_status = case when p_approve then 'approved' else 'none' end
    where user_id = p_user;
end;
$$;

create or replace function admin_leader_requests()
returns table (
  user_id uuid,
  display_name text,
  email text,
  note text,
  status text,
  requested_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select p.user_id,
           coalesce(nullif(trim(p.display_name), ''), ''),
           u.email::text,
           p.leader_note,
           p.leader_status,
           p.leader_requested_at
    from profiles p
    join auth.users u on u.id = p.user_id
    where p.leader_status in ('requested', 'approved')
    order by (p.leader_status = 'requested') desc, p.leader_requested_at desc nulls last;
end;
$$;

-- ------------------------------------------------------------------ --
-- Groups
-- ------------------------------------------------------------------ --
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique,
  leader_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- The leader-set "Day N" and verse. The text is looked up in the app's own
-- scripture library (KJV, NIV, NLT, ESV only), so only the reference and
-- translation are stored.
alter table groups
  add column if not exists votd_day int check (votd_day between 1 and 999),
  add column if not exists votd_reference text check (char_length(votd_reference) <= 60),
  add column if not exists votd_translation text check (votd_translation in ('KJV', 'NIV', 'NLT', 'ESV')),
  add column if not exists votd_note text check (votd_note is null or char_length(votd_note) <= 300),
  add column if not exists votd_updated_at timestamptz;

-- Small Groups' "this week's lesson" is gone; groups are for interaction now.
alter table groups
  drop column if exists focus_section,
  drop column if exists focus_module,
  drop column if exists focus_note;

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user on group_members (user_id);

alter table groups enable row level security;
alter table group_members enable row level security;

create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function is_group_leader(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from groups where id = gid and leader_id = auth.uid());
$$;

drop policy if exists "Members and leaders can read their groups" on groups;
create policy "Members and leaders can read their groups"
  on groups for select
  using (leader_id = auth.uid() or is_group_member(id));

drop policy if exists "Leaders can update their groups" on groups;
create policy "Leaders can update their groups"
  on groups for update
  using (leader_id = auth.uid())
  with check (leader_id = auth.uid());

drop policy if exists "Leaders can delete their groups" on groups;
drop policy if exists "Leaders and admins can delete groups" on groups;
create policy "Leaders and admins can delete groups"
  on groups for delete
  using (leader_id = auth.uid() or is_admin());

drop policy if exists "Members can read their group's roster" on group_members;
create policy "Members can read their group's roster"
  on group_members for select
  using (user_id = auth.uid() or is_group_member(group_id));

drop policy if exists "Leave a group or remove a member" on group_members;
create policy "Leave a group or remove a member"
  on group_members for delete
  using (user_id = auth.uid() or is_group_leader(group_id));

-- A group's 4-digit code: created only by an approved leader (or an admin).
create or replace function create_group(p_name text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  g groups;
  tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not (
    is_admin()
    or exists (select 1 from profiles where user_id = auth.uid() and leader_status = 'approved')
  ) then
    raise exception 'leader status required';
  end if;
  if (select count(*) from groups where leader_id = auth.uid()) >= 5 then
    raise exception 'too many groups';
  end if;
  loop
    code := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from groups where join_code = code);
    tries := tries + 1;
    if tries > 200 then
      raise exception 'no codes available';
    end if;
  end loop;
  insert into groups (name, join_code, leader_id)
    values (left(trim(p_name), 60), code, auth.uid())
    returning * into g;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60));
  return g;
end;
$$;

create or replace function join_group(p_code text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select * into g from groups where join_code = trim(p_code);
  if not found then
    raise exception 'group not found';
  end if;
  if (select count(*) from group_members where group_id = g.id) >= 100 then
    raise exception 'group is full';
  end if;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60))
    on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

-- The roster: names only, in leader-first order.
create or replace function group_overview(p_group uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  select json_build_object(
    'members', coalesce((
      select json_agg(json_build_object(
        'user_id', m.user_id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), 'Member'),
        'is_leader', (m.user_id = g.leader_id),
        'joined_at', m.joined_at
      ) order by (m.user_id = g.leader_id) desc, m.joined_at)
      from group_members m
      join groups g on g.id = m.group_id
      left join profiles p on p.user_id = m.user_id
      where m.group_id = p_group
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------------------ --
-- Chat
-- ------------------------------------------------------------------ --
create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_group_messages_group on group_messages (group_id, created_at);

alter table group_messages enable row level security;

-- Names always come from the server, never from the browser.
create or replace function display_name_for(p_user uuid, p_group uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    nullif(trim((select display_name from profiles where user_id = p_user)), ''),
    nullif((select display_name from group_members where group_id = p_group and user_id = p_user), ''),
    'Member'
  );
$$;

create or replace function set_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_name := display_name_for(new.user_id, new.group_id);
  return new;
end;
$$;

drop trigger if exists group_messages_author on group_messages;
create trigger group_messages_author
  before insert on group_messages
  for each row execute function set_message_author();

drop policy if exists "Members read the chat" on group_messages;
create policy "Members read the chat"
  on group_messages for select
  using (is_group_member(group_id));

drop policy if exists "Members post to the chat" on group_messages;
create policy "Members post to the chat"
  on group_messages for insert
  with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "Delete your own message, or any as leader" on group_messages;
create policy "Delete your own message, or any as leader"
  on group_messages for delete
  using (user_id = auth.uid() or is_group_leader(group_id));

-- Live updates for the chat.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and tablename = 'group_messages'
     ) then
    alter publication supabase_realtime add table group_messages;
  end if;
end $$;

-- ------------------------------------------------------------------ --
-- Prayer wall
-- ------------------------------------------------------------------ --
create table if not exists group_prayers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  anonymous boolean not null default false,
  body text not null check (char_length(body) between 1 and 500),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_prayers_group on group_prayers (group_id, created_at desc);

-- One row per person who prayed. Counts are derived by counting rows.
create table if not exists group_prayer_amens (
  prayer_id uuid not null references group_prayers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);

alter table group_prayers enable row level security;
alter table group_prayer_amens enable row level security;

create or replace function set_prayer_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_name := display_name_for(new.user_id, new.group_id);
  return new;
end;
$$;

drop trigger if exists group_prayers_author on group_prayers;
create trigger group_prayers_author
  before insert on group_prayers
  for each row execute function set_prayer_author();

-- Direct reads are limited to your own rows; everyone else's prayers come
-- through group_prayer_wall(), which hides anonymous authors.
drop policy if exists "Read your own prayers" on group_prayers;
create policy "Read your own prayers"
  on group_prayers for select
  using (user_id = auth.uid());

drop policy if exists "Members post prayers" on group_prayers;
create policy "Members post prayers"
  on group_prayers for insert
  with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "Update your own prayers" on group_prayers;
create policy "Update your own prayers"
  on group_prayers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Delete your own prayer, or any as leader" on group_prayers;
create policy "Delete your own prayer, or any as leader"
  on group_prayers for delete
  using (user_id = auth.uid() or is_group_leader(group_id));

drop policy if exists "Read your own amens" on group_prayer_amens;
create policy "Read your own amens"
  on group_prayer_amens for select
  using (user_id = auth.uid());

create or replace function group_prayer_wall(p_group uuid)
returns table (
  id uuid,
  body text,
  anonymous boolean,
  author_name text,
  answered_at timestamptz,
  created_at timestamptz,
  mine boolean,
  amen_count int,
  prayed boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  return query
    select p.id,
           p.body,
           p.anonymous,
           case when p.anonymous then null else p.author_name end,
           p.answered_at,
           p.created_at,
           (p.user_id = auth.uid()),
           (select count(*)::int from group_prayer_amens a where a.prayer_id = p.id),
           exists (select 1 from group_prayer_amens a where a.prayer_id = p.id and a.user_id = auth.uid())
    from group_prayers p
    where p.group_id = p_group
    order by p.created_at desc
    limit 200;
end;
$$;

-- Tap once to say "I prayed", tap again to take it back. Returns the new state.
create or replace function pray_toggle(p_prayer uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select group_id into gid from group_prayers where id = p_prayer;
  if gid is null or not is_group_member(gid) then
    raise exception 'not allowed';
  end if;
  if exists (select 1 from group_prayer_amens where prayer_id = p_prayer and user_id = auth.uid()) then
    delete from group_prayer_amens where prayer_id = p_prayer and user_id = auth.uid();
    return false;
  end if;
  insert into group_prayer_amens (prayer_id, user_id) values (p_prayer, auth.uid());
  return true;
end;
$$;

-- ------------------------------------------------------------------ --
-- Admin dashboard
-- ------------------------------------------------------------------ --
create or replace function admin_overview()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'learners', (select count(*) from profiles),
    'exam_passed', (select count(*) from profiles where exam_passed_at is not null),
    'leaders', (select count(*) from profiles where leader_status = 'approved'),
    'pending_requests', (select count(*) from profiles where leader_status = 'requested'),
    'groups', (select count(*) from groups),
    'group_members', (select count(*) from group_members),
    'messages', (select count(*) from group_messages),
    'prayers', (select count(*) from group_prayers)
  );
end;
$$;

create or replace function admin_groups()
returns table (
  id uuid,
  name text,
  join_code text,
  leader_name text,
  member_count int,
  message_count int,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select g.id,
           g.name,
           g.join_code,
           coalesce(nullif(trim(p.display_name), ''), '(no name)'),
           (select count(*)::int from group_members m where m.group_id = g.id),
           (select count(*)::int from group_messages x where x.group_id = g.id),
           g.created_at
    from groups g
    left join profiles p on p.user_id = g.leader_id
    order by g.created_at desc;
end;
$$;

grant execute on function request_leader(text) to authenticated;
grant execute on function admin_set_leader(uuid, boolean) to authenticated;
grant execute on function admin_leader_requests() to authenticated;
grant execute on function create_group(text, text) to authenticated;
grant execute on function join_group(text, text) to authenticated;
grant execute on function group_overview(uuid) to authenticated;
grant execute on function group_prayer_wall(uuid) to authenticated;
grant execute on function pray_toggle(uuid) to authenticated;
grant execute on function admin_overview() to authenticated;
grant execute on function admin_groups() to authenticated;

-- ------------------------------------------------------------------ --
-- Admin learners list (also shipped alone as supabase/legacy/012_admin_learners.sql)
-- ------------------------------------------------------------------ --
create or replace function admin_learners()
returns table (
  user_id uuid,
  display_name text,
  full_name text,
  email text,
  signed_up_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select u.id,
           coalesce(nullif(trim(p.display_name), ''), ''),
           coalesce(nullif(trim(p.full_name), ''), ''),
           u.email::text,
           u.created_at
    from auth.users u
    left join profiles p on p.user_id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_learners() to authenticated;

-- ------------------------------------------------------------------ --
-- Profile pictures and sign-up names (also shipped alone as supabase/legacy/013_profiles.sql)
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists avatar text
    check (
      avatar is null
      or avatar ~ '^icon:[a-z]{2,20}$'
      or (avatar like 'data:image/jpeg;base64,%' and char_length(avatar) <= 60000)
    );

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, full_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  return new;
end;
$$;

create or replace function group_overview(p_group uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  select json_build_object(
    'members', coalesce((
      select json_agg(json_build_object(
        'user_id', m.user_id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), 'Member'),
        'is_leader', (m.user_id = g.leader_id),
        'joined_at', m.joined_at,
        'avatar', p.avatar
      ) order by (m.user_id = g.leader_id) desc, m.joined_at)
      from group_members m
      join groups g on g.id = m.group_id
      left join profiles p on p.user_id = m.user_id
      where m.group_id = p_group
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------------------ --
-- Group notifications (also shipped alone as supabase/legacy/014_notifications.sql)
-- ------------------------------------------------------------------ --
create table if not exists group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('joined', 'exam_passed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_group_events_group on group_events (group_id, created_at desc);

alter table group_events enable row level security;

alter table group_members
  add column if not exists events_seen_at timestamptz not null default now();

create or replace function note_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into group_events (group_id, user_id, kind) values (new.group_id, new.user_id, 'joined');
  return new;
end;
$$;

drop trigger if exists trg_note_member_joined on group_members;
create trigger trg_note_member_joined
  after insert on group_members
  for each row execute function note_member_joined();

create or replace function note_exam_passed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.exam_passed_at is not null and old.exam_passed_at is null then
    insert into group_events (group_id, user_id, kind)
    select m.group_id, new.user_id, 'exam_passed'
    from group_members m
    where m.user_id = new.user_id
      and not exists (
        select 1 from group_events e
        where e.group_id = m.group_id and e.user_id = new.user_id and e.kind = 'exam_passed'
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_exam_passed on profiles;
create trigger trg_note_exam_passed
  after update of exam_passed_at on profiles
  for each row execute function note_exam_passed();

create or replace function my_notifications()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(json_agg(n order by n.created_at desc), '[]'::json)
  from (
    select e.id,
           e.group_id,
           g.name as group_name,
           e.kind,
           coalesce(nullif(trim(p.display_name), ''), nullif(am.display_name, ''), 'Someone') as actor_name,
           p.avatar as actor_avatar,
           e.created_at,
           (e.created_at > me.events_seen_at) as unread
    from group_members me
    join group_events e on e.group_id = me.group_id
    join groups g on g.id = e.group_id
    left join profiles p on p.user_id = e.user_id
    left join group_members am on am.group_id = e.group_id and am.user_id = e.user_id
    where me.user_id = auth.uid()
      and e.user_id <> auth.uid()
      and e.created_at > me.joined_at
    order by e.created_at desc
    limit 30
  ) n;
$$;

create or replace function mark_notifications_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update group_members set events_seen_at = now() where user_id = auth.uid();
$$;

grant execute on function my_notifications() to authenticated;
grant execute on function mark_notifications_seen() to authenticated;

alter table groups
  add column if not exists votd_text text check (votd_text is null or char_length(votd_text) <= 2000);

-- ------------------------------------------------------------------ --
-- Group reading plan (also shipped alone as supabase/legacy/016_reading_plan.sql)
-- ------------------------------------------------------------------ --
create table if not exists group_readings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  read_on date not null,
  through_on date,
  passages text not null check (char_length(passages) between 1 and 300),
  plan_title text check (plan_title is null or char_length(plan_title) <= 80),
  unique (group_id, read_on)
);

create index if not exists idx_group_readings_group on group_readings (group_id, read_on);

alter table group_readings enable row level security;

drop policy if exists "members read the plan" on group_readings;
create policy "members read the plan" on group_readings
  for select using (is_group_member(group_id));

create or replace function set_group_plan(p_group uuid, p_title text, p_days jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can set the plan';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 400 then
    raise exception 'a plan can have at most 400 days';
  end if;
  delete from group_readings where group_id = p_group;
  insert into group_readings (group_id, read_on, through_on, passages, plan_title)
  select p_group, x.read_on, x.through_on, x.passages, nullif(left(trim(coalesce(p_title, '')), 80), '')
  from jsonb_to_recordset(p_days) as x(read_on date, through_on date, passages text);
end;
$$;

grant execute on function set_group_plan(uuid, text, jsonb) to authenticated;

-- ------------------------------------------------------------------ --
-- Co-leaders (also shipped alone as supabase/legacy/017_co_leaders.sql)
-- ------------------------------------------------------------------ --
alter table group_members
  add column if not exists is_co_leader boolean not null default false;

create or replace function is_group_manager(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from groups where id = gid and leader_id = auth.uid())
      or exists (
        select 1 from group_members
        where group_id = gid and user_id = auth.uid() and is_co_leader
      );
$$;

-- Leader tools: the group row (verse of the day), chat and prayer moderation, removing members.
drop policy if exists "Leaders can update their groups" on groups;
create policy "Leaders can update their groups"
  on groups for update
  using (is_group_manager(id))
  with check (is_group_manager(id));

-- Co-leaders may change the verse of the day, nothing about who owns the group.
create or replace function protect_group_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() is distinct from old.leader_id
     and (new.leader_id is distinct from old.leader_id
          or new.join_code is distinct from old.join_code
          or new.name is distinct from old.name) then
    raise exception 'only the group leader can change the group itself';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_group_identity on groups;
create trigger trg_protect_group_identity
  before update on groups
  for each row execute function protect_group_identity();

drop policy if exists "Leave a group or remove a member" on group_members;
create policy "Leave a group or remove a member"
  on group_members for delete
  using (
    user_id = auth.uid()
    or is_group_leader(group_id)
    or (
      is_group_manager(group_id)
      and not is_co_leader
      and not exists (select 1 from groups g where g.id = group_id and g.leader_id = group_members.user_id)
    )
  );

drop policy if exists "Delete your own message, or any as leader" on group_messages;
create policy "Delete your own message, or any as leader"
  on group_messages for delete
  using (user_id = auth.uid() or is_group_manager(group_id));

drop policy if exists "Delete your own prayer, or any as leader" on group_prayers;
create policy "Delete your own prayer, or any as leader"
  on group_prayers for delete
  using (user_id = auth.uid() or is_group_manager(group_id));

-- Only the group's leader can name co-leaders.
create or replace function set_co_leader(p_group uuid, p_user uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can name co-leaders';
  end if;
  if exists (select 1 from groups where id = p_group and leader_id = p_user) then
    raise exception 'the leader is already in charge';
  end if;
  update group_members set is_co_leader = p_value where group_id = p_group and user_id = p_user;
  if not found then
    raise exception 'that person is not in the group';
  end if;
end;
$$;

grant execute on function set_co_leader(uuid, uuid, boolean) to authenticated;

-- The reading plan is a leader tool too.
create or replace function set_group_plan(p_group uuid, p_title text, p_days jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_manager(p_group) then
    raise exception 'only the group leader can set the plan';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 400 then
    raise exception 'a plan can have at most 400 days';
  end if;
  delete from group_readings where group_id = p_group;
  insert into group_readings (group_id, read_on, through_on, passages, plan_title)
  select p_group, x.read_on, x.through_on, x.passages, nullif(left(trim(coalesce(p_title, '')), 80), '')
  from jsonb_to_recordset(p_days) as x(read_on date, through_on date, passages text);
end;
$$;

-- The roster now says who the co-leaders are.
create or replace function group_overview(p_group uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  select json_build_object(
    'members', coalesce((
      select json_agg(json_build_object(
        'user_id', m.user_id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), 'Member'),
        'is_leader', (m.user_id = g.leader_id),
        'is_co_leader', m.is_co_leader,
        'joined_at', m.joined_at,
        'avatar', p.avatar
      ) order by (m.user_id = g.leader_id) desc, m.is_co_leader desc, m.joined_at)
      from group_members m
      join groups g on g.id = m.group_id
      left join profiles p on p.user_id = m.user_id
      where m.group_id = p_group
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------------------ --
-- Reading progress (also shipped alone as supabase/legacy/018_reading_progress.sql)
-- ------------------------------------------------------------------ --
create table if not exists group_reading_checks (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_on date not null,
  checked_at timestamptz not null default now(),
  primary key (group_id, user_id, read_on)
);

alter table group_reading_checks enable row level security;

drop policy if exists "members see reading checks" on group_reading_checks;
create policy "members see reading checks" on group_reading_checks
  for select using (is_group_member(group_id));

drop policy if exists "check off your own reading" on group_reading_checks;
create policy "check off your own reading" on group_reading_checks
  for insert with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "undo your own reading check" on group_reading_checks;
create policy "undo your own reading check" on group_reading_checks
  for delete using (user_id = auth.uid());

-- Per person: how many readings they have ticked, and whether they ticked p_date.
create or replace function group_reading_progress(p_group uuid, p_date date)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  return coalesce((
    select json_agg(json_build_object(
      'user_id', c.user_id,
      'total', c.total,
      'today', c.today,
      'dates', c.dates
    ))
    from (
      select user_id,
             count(*) as total,
             bool_or(read_on = p_date) as today,
             json_agg(read_on order by read_on) as dates
      from group_reading_checks
      where group_id = p_group
      group by user_id
    ) c
  ), '[]'::json);
end;
$$;

grant execute on function group_reading_progress(uuid, date) to authenticated;

-- A new plan starts everyone fresh.
create or replace function set_group_plan(p_group uuid, p_title text, p_days jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_manager(p_group) then
    raise exception 'only the group leader can set the plan';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 400 then
    raise exception 'a plan can have at most 400 days';
  end if;
  delete from group_readings where group_id = p_group;
  delete from group_reading_checks where group_id = p_group;
  insert into group_readings (group_id, read_on, through_on, passages, plan_title)
  select p_group, x.read_on, x.through_on, x.passages, nullif(left(trim(coalesce(p_title, '')), 80), '')
  from jsonb_to_recordset(p_days) as x(read_on date, through_on date, passages text);
end;
$$;

-- ------------------------------------------------------------------ --
-- Editable site text (also shipped alone as supabase/legacy/019_site_text.sql)
-- ------------------------------------------------------------------ --
create table if not exists site_text (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table site_text enable row level security;

drop policy if exists "Anyone can read site text" on site_text;
create policy "Anyone can read site text"
  on site_text for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage site text" on site_text;
create policy "Admins manage site text"
  on site_text for all
  to authenticated
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------------ --
-- 20261005000100_group_settings.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers — migration 020: group settings
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Lets a group's leader (not co-leaders):
--   * rename the group (a plain update, already limited to the leader),
--   * make a new join code, which retires the old code and QR,
--   * stop or resume new members joining with the code,
--   * hand the group to another approved leader, and
--   * archive the group instead of deleting it (and restore it later).
-- Archived groups do not count toward a leader's limit of 5 groups, and
-- nobody can join one.

alter table groups
  add column if not exists join_enabled boolean not null default true,
  add column if not exists archived_at timestamptz;

create or replace function create_group(p_name text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  g groups;
  tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not (
    is_admin()
    or exists (select 1 from profiles where user_id = auth.uid() and leader_status = 'approved')
  ) then
    raise exception 'leader status required';
  end if;
  if (select count(*) from groups where leader_id = auth.uid() and archived_at is null) >= 5 then
    raise exception 'too many groups';
  end if;
  loop
    code := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from groups where join_code = code);
    tries := tries + 1;
    if tries > 200 then
      raise exception 'no codes available';
    end if;
  end loop;
  insert into groups (name, join_code, leader_id)
    values (left(trim(p_name), 60), code, auth.uid())
    returning * into g;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60));
  return g;
end;
$$;

create or replace function join_group(p_code text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select * into g from groups where join_code = trim(p_code);
  if not found then
    raise exception 'group not found';
  end if;
  if g.archived_at is not null or not g.join_enabled then
    raise exception 'joining is off';
  end if;
  if (select count(*) from group_members where group_id = g.id) >= 100 then
    raise exception 'group is full';
  end if;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60))
    on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

-- A new random code; the old one stops working right away.
create or replace function regenerate_group_code(p_group uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  tries int := 0;
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can change the code';
  end if;
  loop
    code := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from groups where join_code = code);
    tries := tries + 1;
    if tries > 200 then
      raise exception 'no codes available';
    end if;
  end loop;
  update groups set join_code = code where id = p_group;
  return code;
end;
$$;

create or replace function set_group_joining(p_group uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can change this';
  end if;
  update groups set join_enabled = p_enabled where id = p_group;
end;
$$;

create or replace function set_group_archived(p_group uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can archive the group';
  end if;
  if not p_archived
     and (select count(*) from groups where leader_id = auth.uid() and archived_at is null) >= 5 then
    raise exception 'too many groups';
  end if;
  update groups
     set archived_at = case when p_archived then now() else null end,
         join_enabled = case when p_archived then false else join_enabled end
   where id = p_group;
end;
$$;

-- Hands the group to a member who is an approved leader (so only the admin still
-- decides who can lead). The previous leader stays on as a co-leader.
create or replace function transfer_group_leadership(p_group uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_leader(p_group) then
    raise exception 'only the group leader can hand over the group';
  end if;
  if p_user = auth.uid() then
    raise exception 'you already lead this group';
  end if;
  if not exists (select 1 from group_members where group_id = p_group and user_id = p_user) then
    raise exception 'that person is not in the group';
  end if;
  if not exists (select 1 from profiles where user_id = p_user and leader_status = 'approved') then
    raise exception 'new leader must be approved';
  end if;
  if (select count(*) from groups where leader_id = p_user and archived_at is null) >= 5 then
    raise exception 'too many groups';
  end if;
  update groups set leader_id = p_user where id = p_group;
  update group_members set is_co_leader = false where group_id = p_group and user_id = p_user;
  update group_members set is_co_leader = true where group_id = p_group and user_id = auth.uid();
end;
$$;

grant execute on function regenerate_group_code(uuid) to authenticated;
grant execute on function set_group_joining(uuid, boolean) to authenticated;
grant execute on function set_group_archived(uuid, boolean) to authenticated;
grant execute on function transfer_group_leadership(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- 20261005000200_lesson_feedback.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers — migration 021: lesson feedback
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A signed-in learner can say whether a lesson helped, with an optional note.
-- One answer per person per lesson (they can change it). Learners see only
-- their own answer; admins see everyone's, without names, to improve the text.

create table if not exists lesson_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('introduction', '1', '2', '3', '4')),
  module_index int not null check (module_index between 0 and 30),
  helpful boolean not null,
  note text check (note is null or char_length(note) <= 600),
  updated_at timestamptz not null default now(),
  primary key (user_id, section, module_index)
);

alter table lesson_feedback enable row level security;

drop policy if exists "Read your own lesson feedback" on lesson_feedback;
create policy "Read your own lesson feedback" on lesson_feedback
  for select using (user_id = auth.uid());

drop policy if exists "Admins read all lesson feedback" on lesson_feedback;
create policy "Admins read all lesson feedback" on lesson_feedback
  for select using (is_admin());

drop policy if exists "Give lesson feedback" on lesson_feedback;
create policy "Give lesson feedback" on lesson_feedback
  for insert with check (user_id = auth.uid());

drop policy if exists "Change your lesson feedback" on lesson_feedback;
create policy "Change your lesson feedback" on lesson_feedback
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Remove your lesson feedback" on lesson_feedback;
create policy "Remove your lesson feedback" on lesson_feedback
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------------ --
-- 20261005000300_reminders.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers — migration 022: daily reading reminders
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Learners can ask for a reminder (by email, or as a notification on a device)
-- on days their group has a reading they have not marked. The reminders are
-- sent by the scheduled function /api/reminders (see api/reminders.ts), which
-- calls reminders_due() with the service role key. Nobody else can call it.

alter table profiles
  add column if not exists email_reminders boolean not null default false,
  add column if not exists reminder_lang text not null default 'en' check (reminder_lang in ('en', 'es'));

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Read your own push subscriptions" on push_subscriptions;
create policy "Read your own push subscriptions" on push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "Add your own push subscription" on push_subscriptions;
create policy "Add your own push subscription" on push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "Remove your own push subscription" on push_subscriptions;
create policy "Remove your own push subscription" on push_subscriptions
  for delete using (user_id = auth.uid());

-- Everyone who should be reminded on p_date: they are in a group (not archived) whose plan has a
-- reading covering that date, they have not ticked it, and they asked for email or have a device.
create or replace function reminders_due(p_date date)
returns table (
  user_id uuid,
  email text,
  display_name text,
  group_id uuid,
  group_name text,
  passages text,
  wants_email boolean,
  lang text
)
language sql
security definer
stable
set search_path = public
as $$
  select m.user_id,
         u.email::text,
         coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), '') as display_name,
         g.id,
         g.name,
         r.passages,
         p.email_reminders,
         p.reminder_lang
  from group_readings r
  join groups g on g.id = r.group_id and g.archived_at is null
  join group_members m on m.group_id = g.id
  join profiles p on p.user_id = m.user_id
  join auth.users u on u.id = m.user_id
  where (r.read_on = p_date or (r.through_on is not null and r.read_on <= p_date and p_date <= r.through_on))
    and not exists (
      select 1 from group_reading_checks c
      where c.group_id = g.id and c.user_id = m.user_id and c.read_on = r.read_on
    )
    and (
      p.email_reminders
      or exists (select 1 from push_subscriptions s where s.user_id = m.user_id)
    );
$$;

revoke all on function reminders_due(date) from public, anon, authenticated;
grant execute on function reminders_due(date) to service_role;

-- ------------------------------------------------------------------ --
-- 20261006000100_activity_analytics_digest.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers: learner activity, saved calculator scenarios, analytics, leader progress, leader digest.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ------------------------------------------------------------------ --
-- When someone last used the app
-- ------------------------------------------------------------------ --
alter table profiles add column if not exists last_seen_at timestamptz;

-- Called by the app when it opens; writes at most once every 10 minutes per person.
create or replace function touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles
     set last_seen_at = now()
   where user_id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
$$;
grant execute on function touch_last_seen() to authenticated;

-- ------------------------------------------------------------------ --
-- Admin: learners list now includes when each person was last active
-- ------------------------------------------------------------------ --
drop function if exists admin_learners();
create or replace function admin_learners()
returns table (
  user_id uuid,
  display_name text,
  full_name text,
  email text,
  signed_up_at timestamptz,
  last_active_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select u.id,
           coalesce(nullif(trim(p.display_name), ''), ''),
           coalesce(nullif(trim(p.full_name), ''), ''),
           u.email::text,
           u.created_at,
           greatest(p.last_seen_at, u.last_sign_in_at)
    from auth.users u
    left join profiles p on p.user_id = u.id
    order by u.created_at desc;
end;
$$;
grant execute on function admin_learners() to authenticated;

-- ------------------------------------------------------------------ --
-- Admin: everything one learner has done (the three-dot menu in Learners)
-- ------------------------------------------------------------------ --
create or replace function admin_learner_activity(p_user uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  select json_build_object(
    'email', u.email,
    'signed_up_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'last_seen_at', p.last_seen_at,
    'exam_passed_at', p.exam_passed_at,
    'exam_best_score', p.exam_best_score,
    'challenge_started_at', p.challenge_started_at,
    'leader_status', p.leader_status,
    'rivers', coalesce((
      select json_agg(json_build_object(
        'river', c.river_number,
        'lesson_viewed_at', c.lesson_viewed_at,
        'completed_at', c.completed_at,
        'quiz_passed_at', c.quiz_passed_at,
        'quiz_best_score', c.quiz_best_score
      ) order by c.river_number)
      from course_progress c where c.user_id = p_user
    ), '[]'::json),
    'modules_read', (select count(*) from module_views v where v.user_id = p_user),
    'entries', json_build_object(
      'income', (select count(*) from income_streams where user_id = p_user),
      'savings', (select count(*) from savings_contributions where user_id = p_user),
      'investing', (select count(*) from investment_entries where user_id = p_user),
      'giving', (select count(*) from giving_entries where user_id = p_user)
    ),
    'groups', coalesce((
      select json_agg(json_build_object(
        'name', g.name,
        'role', case when g.leader_id = p_user then 'leader' when m.is_co_leader then 'co-leader' else 'member' end,
        'joined_at', m.joined_at,
        'readings_checked', (select count(*) from group_reading_checks k where k.group_id = g.id and k.user_id = p_user)
      ) order by m.joined_at desc)
      from group_members m join groups g on g.id = m.group_id
      where m.user_id = p_user
    ), '[]'::json),
    'recent', coalesce((
      select json_agg(x order by (x ->> 'at') desc)
      from (
        select json_build_object('kind', 'module', 'section', v.section, 'index', v.module_index, 'at', v.viewed_at) as x
        from module_views v where v.user_id = p_user
        order by v.viewed_at desc limit 12
      ) recent
    ), '[]'::json)
  )
  into result
  from auth.users u
  left join profiles p on p.user_id = u.id
  where u.id = p_user;
  return result;
end;
$$;
grant execute on function admin_learner_activity(uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- Saved calculator scenarios (the dashboard's calculators)
-- ------------------------------------------------------------------ --
create table if not exists calculator_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null check (tool in ('budget', 'paths', 'impact', 'savings', 'investing', 'tvm')),
  name text not null check (char_length(name) between 1 and 60),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_calculator_scenarios_user on calculator_scenarios (user_id, tool);

alter table calculator_scenarios enable row level security;
drop policy if exists "Manage your own scenarios" on calculator_scenarios;
create policy "Manage your own scenarios" on calculator_scenarios
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and pg_column_size(data) < 20000);

-- ------------------------------------------------------------------ --
-- Which quiz and exam questions people miss (no names are stored)
-- ------------------------------------------------------------------ --
create table if not exists question_stats (
  section text not null check (section in ('q1', 'q2', 'q3', 'q4', 'exam')),
  idx int not null check (idx >= 0),
  attempts int not null default 0,
  misses int not null default 0,
  primary key (section, idx)
);
alter table question_stats enable row level security;
-- No policies: only the functions below read or write it.

create or replace function record_question_stats(p_section text, p_total int, p_missed int[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if p_section not in ('q1', 'q2', 'q3', 'q4', 'exam') or p_total not between 1 and 60 then
    raise exception 'bad input';
  end if;
  insert into question_stats (section, idx, attempts, misses)
  select p_section, i, 1, case when i = any(coalesce(p_missed, '{}')) then 1 else 0 end
  from generate_series(0, p_total - 1) as i
  on conflict (section, idx) do update
    set attempts = question_stats.attempts + 1,
        misses = question_stats.misses + excluded.misses;
end;
$$;
grant execute on function record_question_stats(text, int, int[]) to authenticated;

create or replace function admin_question_stats()
returns table (section text, idx int, attempts int, misses int)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query select s.section, s.idx, s.attempts, s.misses from question_stats s;
end;
$$;
grant execute on function admin_question_stats() to authenticated;

-- ------------------------------------------------------------------ --
-- Admin analytics: the funnel through the course
-- ------------------------------------------------------------------ --
create or replace function admin_analytics()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'learners', (select count(*) from profiles),
    'started', (select count(distinct user_id) from module_views),
    'active_7d', (select count(*) from profiles where last_seen_at >= now() - interval '7 days'),
    'active_30d', (select count(*) from profiles where last_seen_at >= now() - interval '30 days'),
    'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'exam_passed', (select count(*) from profiles where exam_passed_at is not null),
    'challenge_started', (select count(*) from profiles where challenge_started_at is not null),
    'rivers', coalesce((
      select json_agg(json_build_object(
        'river', r.n,
        'started', (select count(*) from course_progress c where c.river_number = r.n and c.lesson_viewed_at is not null),
        'completed', (select count(*) from course_progress c where c.river_number = r.n and c.completed_at is not null),
        'quiz_passed', (select count(*) from course_progress c where c.river_number = r.n and c.quiz_passed_at is not null),
        'avg_best_score', (select round(avg(c.quiz_best_score)::numeric, 1) from course_progress c where c.river_number = r.n and c.quiz_best_score is not null)
      ) order by r.n)
      from generate_series(1, 4) as r(n)
    ), '[]'::json),
    'signups_by_week', coalesce((
      select json_agg(json_build_object('week', w, 'count', n) order by w)
      from (
        select date_trunc('week', created_at)::date as w, count(*) as n
        from auth.users
        where created_at >= now() - interval '12 weeks'
        group by 1
      ) s
    ), '[]'::json)
  );
end;
$$;
grant execute on function admin_analytics() to authenticated;

-- ------------------------------------------------------------------ --
-- Leaders: how each member is doing in the course
-- ------------------------------------------------------------------ --
create or replace function group_member_progress(p_group uuid)
returns table (
  user_id uuid,
  rivers_complete int,
  modules_read int,
  exam_passed boolean,
  last_seen_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_group_manager(p_group) then
    raise exception 'not allowed';
  end if;
  return query
    select m.user_id,
           (select count(*)::int from course_progress c where c.user_id = m.user_id and c.completed_at is not null),
           (select count(*)::int from module_views v where v.user_id = m.user_id),
           (p.exam_passed_at is not null),
           p.last_seen_at
    from group_members m
    left join profiles p on p.user_id = m.user_id
    where m.group_id = p_group;
end;
$$;
grant execute on function group_member_progress(uuid) to authenticated;

-- ------------------------------------------------------------------ --
-- Weekly digest for group leaders (sent by /api/digest with the service role)
-- ------------------------------------------------------------------ --
alter table profiles add column if not exists digest_emails boolean not null default true;

create or replace function leader_digest(p_from date, p_to date)
returns table (
  user_id uuid,
  email text,
  display_name text,
  lang text,
  group_id uuid,
  group_name text,
  stats jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  with g as (
    select gr.id, gr.name, gr.leader_id
    from groups gr
    where gr.archived_at is null
  ),
  leaders as (
    select g.id as group_id, g.name as group_name, g.leader_id as user_id from g
    union
    select g.id, g.name, m.user_id
    from g join group_members m on m.group_id = g.id and m.is_co_leader
  ),
  days as (
    select r.group_id, count(*)::int as n
    from group_readings r
    where r.read_on between p_from and p_to
    group by r.group_id
  ),
  per_member as (
    select m.group_id, m.user_id, m.display_name,
           (select count(*) from group_reading_checks c
             where c.group_id = m.group_id and c.user_id = m.user_id and c.read_on between p_from and p_to)::int as ticks
    from group_members m
  )
  select l.user_id,
         u.email::text,
         coalesce(nullif(trim(p.display_name), ''), '') as display_name,
         p.reminder_lang,
         l.group_id,
         l.group_name,
         jsonb_build_object(
           'members', (select count(*) from group_members m where m.group_id = l.group_id),
           'new_members', (select count(*) from group_members m where m.group_id = l.group_id and m.joined_at::date between p_from and p_to),
           'reading_days', coalesce((select n from days d where d.group_id = l.group_id), 0),
           'ticks', (select coalesce(sum(ticks), 0) from per_member pm where pm.group_id = l.group_id),
           'finished_all', coalesce((
             select jsonb_agg(pm.display_name order by pm.display_name) from per_member pm
             where pm.group_id = l.group_id and (select n from days d where d.group_id = l.group_id) > 0
               and pm.ticks >= (select n from days d where d.group_id = l.group_id)
           ), '[]'::jsonb),
           'none', coalesce((
             select jsonb_agg(pm.display_name order by pm.display_name) from per_member pm
             where pm.group_id = l.group_id and (select n from days d where d.group_id = l.group_id) > 0 and pm.ticks = 0
           ), '[]'::jsonb),
           'new_prayers', (select count(*) from group_prayers y where y.group_id = l.group_id and y.created_at::date between p_from and p_to),
           'answered', (select count(*) from group_prayers y where y.group_id = l.group_id and y.answered_at::date between p_from and p_to)
         )
  from leaders l
  join profiles p on p.user_id = l.user_id
  join auth.users u on u.id = l.user_id
  where p.digest_emails;
$$;

revoke all on function leader_digest(date, date) from public, anon, authenticated;
grant execute on function leader_digest(date, date) to service_role;

-- ------------------------------------------------------------------ --
-- 20261006000200_prayer_alerts_announcements_stats.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers: answered-prayer alerts, announcements, leader-request and welcome emails, public numbers strip.
-- Run once in the Supabase SQL editor, AFTER 20261006000100. Safe to re-run.

-- ------------------------------------------------------------------ --
-- Answered-prayer alerts: only the person who posted the request and the group's leaders hear about it
-- ------------------------------------------------------------------ --
alter table group_events
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists prayer_id uuid references group_prayers(id) on delete cascade,
  add column if not exists note text,
  add column if not exists actor_hidden boolean not null default false,
  add column if not exists is_poster boolean not null default false;

alter table group_events drop constraint if exists group_events_kind_check;
alter table group_events
  add constraint group_events_kind_check check (kind in ('joined', 'exam_passed', 'prayer_answered'));

create or replace function note_prayer_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := coalesce(auth.uid(), new.user_id);
begin
  if new.answered_at is not null and old.answered_at is null then
    insert into group_events (group_id, user_id, kind, recipient_id, prayer_id, note, actor_hidden, is_poster)
    select new.group_id,
           actor,
           'prayer_answered',
           r.user_id,
           new.id,
           left(new.body, 90),
           -- Someone who posted a request without their name stays unnamed when they mark it answered.
           (new.anonymous and actor = new.user_id),
           (r.user_id = new.user_id)
    from (
      select new.user_id as user_id
      union
      select g.leader_id from groups g where g.id = new.group_id
      union
      select m.user_id from group_members m where m.group_id = new.group_id and m.is_co_leader
    ) r
    where r.user_id is not null and r.user_id <> actor;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_prayer_answered on group_prayers;
create trigger trg_note_prayer_answered
  after update of answered_at on group_prayers
  for each row execute function note_prayer_answered();

-- Marking a request answered: the person who posted it, or one of the group's leaders (who may hear it from them).
create or replace function set_prayer_answered(p_prayer uuid, p_answered boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  owner uuid;
begin
  select group_id, user_id into gid, owner from group_prayers where id = p_prayer;
  if gid is null then
    raise exception 'prayer not found';
  end if;
  if auth.uid() is distinct from owner and not is_group_manager(gid) then
    raise exception 'only the person who posted this, or a group leader, can change it';
  end if;
  update group_prayers
     set answered_at = case when p_answered then coalesce(answered_at, now()) else null end
   where id = p_prayer;
end;
$$;
grant execute on function set_prayer_answered(uuid, boolean) to authenticated;

create or replace function my_notifications()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(json_agg(n order by n.created_at desc), '[]'::json)
  from (
    select e.id,
           e.group_id,
           g.name as group_name,
           e.kind,
           case when e.actor_hidden then 'Someone'
                else coalesce(nullif(trim(p.display_name), ''), nullif(am.display_name, ''), 'Someone') end as actor_name,
           case when e.actor_hidden then null else p.avatar end as actor_avatar,
           e.note,
           e.is_poster as mine,
           e.created_at,
           (e.created_at > me.events_seen_at) as unread
    from group_members me
    join group_events e on e.group_id = me.group_id
    join groups g on g.id = e.group_id
    left join profiles p on p.user_id = e.user_id
    left join group_members am on am.group_id = e.group_id and am.user_id = e.user_id
    where me.user_id = auth.uid()
      and e.user_id <> auth.uid()
      and (e.recipient_id is null or e.recipient_id = auth.uid())
      and e.created_at > me.joined_at
    order by e.created_at desc
    limit 30
  ) n;
$$;
grant execute on function my_notifications() to authenticated;

-- ------------------------------------------------------------------ --
-- Emails: welcome, leader-request alert, announcements
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists leader_request_notified_at timestamptz,
  add column if not exists announce_emails boolean not null default true;

-- Everyone who already has an account has been welcomed; only new sign-ups get the welcome email.
update profiles set welcome_sent_at = now() where welcome_sent_at is null;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('leaders', 'everyone')),
  subject text not null check (char_length(subject) between 1 and 150),
  body text not null check (char_length(body) between 1 and 5000),
  sent_by uuid references auth.users(id) on delete set null,
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table announcements enable row level security;
-- No policies: only the functions below and the server (service role) touch it.

create or replace function admin_announcements()
returns table (id uuid, audience text, subject text, body text, sent_count int, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select a.id, a.audience, a.subject, a.body, a.sent_count, a.created_at
    from announcements a order by a.created_at desc limit 50;
end;
$$;
grant execute on function admin_announcements() to authenticated;

-- Who an announcement goes to (server only). Leaders means approved leaders plus co-leaders.
create or replace function announcement_recipients(p_audience text)
returns table (user_id uuid, email text, display_name text, lang text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, u.email::text, coalesce(nullif(trim(p.display_name), ''), ''), p.reminder_lang
  from profiles p
  join auth.users u on u.id = p.user_id
  where p.announce_emails
    and u.email is not null
    and (
      p_audience = 'everyone'
      or p.leader_status = 'approved'
      or exists (select 1 from group_members m where m.user_id = p.user_id and m.is_co_leader)
    );
$$;
revoke all on function announcement_recipients(text) from public, anon, authenticated;
grant execute on function announcement_recipients(text) to service_role;

-- ------------------------------------------------------------------ --
-- The home page's "by the numbers" strip: the admin turns it on or off, anyone can read the numbers while it is on
-- ------------------------------------------------------------------ --
create or replace function public_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  on_ boolean;
begin
  select coalesce((content ->> 'enabled')::boolean, false) into on_ from site_text where id = 'settings:stats';
  if not coalesce(on_, false) then
    return json_build_object('enabled', false);
  end if;
  return json_build_object(
    'enabled', true,
    'learners', (select count(*) from profiles),
    'certificates', (select count(*) from profiles where exam_passed_at is not null),
    'groups', (select count(*) from groups where archived_at is null)
  );
end;
$$;
grant execute on function public_stats() to anon, authenticated;

-- ------------------------------------------------------------------ --
-- 20261006000300_overview_counts.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers: four more counts on the Admin overview (prayers answered, reading check-offs, lessons read, tracker entries),
-- and the analytics funnel's "read a lesson" now counts people from both the module log and the river progress rows.
-- Run once in the Supabase SQL editor, AFTER 20261006000200. Safe to re-run.

create or replace function admin_overview()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'learners', (select count(*) from profiles),
    'exam_passed', (select count(*) from profiles where exam_passed_at is not null),
    'leaders', (select count(*) from profiles where leader_status = 'approved'),
    'pending_requests', (select count(*) from profiles where leader_status = 'requested'),
    'groups', (select count(*) from groups),
    'group_members', (select count(*) from group_members),
    'messages', (select count(*) from group_messages),
    'prayers', (select count(*) from group_prayers),
    'prayers_answered', (select count(*) from group_prayers where answered_at is not null),
    'reading_checks', (select count(*) from group_reading_checks),
    'modules_read', (select count(*) from module_views),
    'tracker_entries',
      (select count(*) from income_streams)
      + (select count(*) from savings_contributions)
      + (select count(*) from investment_entries)
      + (select count(*) from giving_entries)
  );
end;
$$;
grant execute on function admin_overview() to authenticated;

-- "Read a lesson" in the analytics funnel: anyone with a module read OR a river started (older accounts only have the latter).
create or replace function admin_analytics()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'learners', (select count(*) from profiles),
    'started', (
      select count(*) from (
        select user_id from module_views
        union
        select user_id from course_progress where lesson_viewed_at is not null
      ) u
    ),
    'active_7d', (select count(*) from profiles where last_seen_at >= now() - interval '7 days'),
    'active_30d', (select count(*) from profiles where last_seen_at >= now() - interval '30 days'),
    'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'exam_passed', (select count(*) from profiles where exam_passed_at is not null),
    'challenge_started', (select count(*) from profiles where challenge_started_at is not null),
    'rivers', coalesce((
      select json_agg(json_build_object(
        'river', r.n,
        'started', (select count(*) from course_progress c where c.river_number = r.n and c.lesson_viewed_at is not null),
        'completed', (select count(*) from course_progress c where c.river_number = r.n and c.completed_at is not null),
        'quiz_passed', (select count(*) from course_progress c where c.river_number = r.n and c.quiz_passed_at is not null),
        'avg_best_score', (select round(avg(c.quiz_best_score)::numeric, 1) from course_progress c where c.river_number = r.n and c.quiz_best_score is not null)
      ) order by r.n)
      from generate_series(1, 4) as r(n)
    ), '[]'::json),
    'signups_by_week', coalesce((
      select json_agg(json_build_object('week', w, 'count', n) order by w)
      from (
        select date_trunc('week', created_at)::date as w, count(*) as n
        from auth.users
        where created_at >= now() - interval '12 weeks'
        group by 1
      ) s
    ), '[]'::json)
  );
end;
$$;
grant execute on function admin_analytics() to authenticated;

-- ------------------------------------------------------------------ --
-- 20261008000100_outreach.sql
-- ------------------------------------------------------------------ --
-- 4 Rivers: Outreach (bulk invitations for church and campus leaders).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- An admin pastes a list of email addresses. Each is recorded here; anyone who already has an account is approved
-- as a group leader straight away, and anyone who signs up later with that address is approved the moment they do.

create table if not exists leader_invites (
  email text primary key check (email = lower(email)),
  approve boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table leader_invites enable row level security;
-- No policies: only the functions below touch it.

-- A new account whose address was invited (with approval) starts as an approved leader.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invited boolean;
begin
  select approve into invited from leader_invites where email = lower(new.email) and approve;
  insert into public.profiles (user_id, display_name, full_name, leader_status)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when coalesce(invited, false) then 'approved' else 'none' end
  );
  if coalesce(invited, false) then
    update leader_invites set accepted_at = now() where email = lower(new.email);
  end if;
  return new;
end;
$$;

-- Admin: record a list of invitations. Returns how many were new, how many already had accounts, and how many of
-- those were approved on the spot.
create or replace function admin_apply_leader_invites(p_emails text[], p_approve boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  e text;
  cleaned text[];
  uid uuid;
  total int := 0;
  with_account int := 0;
  approved_now int := 0;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  select coalesce(array_agg(distinct lower(trim(x))), '{}')
    into cleaned
    from unnest(p_emails) x
   where trim(x) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  if coalesce(array_length(cleaned, 1), 0) > 200 then
    raise exception 'at most 200 at a time';
  end if;
  foreach e in array cleaned loop
    total := total + 1;
    insert into leader_invites (email, approve, invited_by)
    values (e, p_approve, auth.uid())
    on conflict (email) do update set approve = excluded.approve, invited_by = excluded.invited_by,
      created_at = now(), accepted_at = case when leader_invites.accepted_at is not null then leader_invites.accepted_at else null end;
    select id into uid from auth.users where lower(email) = e limit 1;
    if uid is not null then
      with_account := with_account + 1;
      if p_approve then
        update profiles set leader_status = 'approved' where user_id = uid and leader_status <> 'approved';
        update leader_invites set accepted_at = now() where email = e;
        approved_now := approved_now + 1;
      end if;
    end if;
  end loop;
  return json_build_object('total', total, 'with_account', with_account, 'approved_now', approved_now,
                           'pending', total - approved_now);
end;
$$;
grant execute on function admin_apply_leader_invites(text[], boolean) to authenticated;

create or replace function admin_leader_invites()
returns table (email text, approve boolean, created_at timestamptz, accepted_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select i.email, i.approve, i.created_at, i.accepted_at
    from leader_invites i order by i.created_at desc limit 300;
end;
$$;
grant execute on function admin_leader_invites() to authenticated;

create or replace function admin_cancel_leader_invite(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  delete from leader_invites where email = lower(trim(p_email)) and accepted_at is null;
end;
$$;
grant execute on function admin_cancel_leader_invite(text) to authenticated;
