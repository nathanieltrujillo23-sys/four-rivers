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
