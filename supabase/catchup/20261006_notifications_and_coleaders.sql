-- 4 Rivers: catch-up for two older updates that were never run on the live project.
-- Run this ONCE in the Supabase SQL editor, BEFORE 20261006000100_activity_analytics_digest.sql.
-- Safe to re-run.
--
-- Missing on the live project (found 2026-10-06 by checking it with the guest account):
--   * group notifications (the bell): table group_events, my_notifications(), mark_notifications_seen()
--   * co-leaders: group_members.is_co_leader, is_group_manager(), set_co_leader()
-- Without them, setting a group's reading plan fails (it calls is_group_manager), the bell shows nothing,
-- and co-leaders cannot be named. This file is the old files 014 and 017, then the final set_group_plan from 018.

-- ===================================================================
-- Part 1 of 3: group notifications (old file 014)
-- ===================================================================

-- 4 Rivers — migration 014: group notifications
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Tells group members when someone joins the group or passes the final exam.
--   * group_events is written only by triggers (no one can insert directly)
--     and read only through my_notifications(), which returns events from
--     groups you belong to, newest first, never your own, and never from
--     before you joined.
--   * Passing the exam is shared with the people in your groups, nothing else.
--   * group_members.events_seen_at remembers when you last opened the bell.

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

-- ===================================================================
-- Part 2 of 3: co-leaders (old file 017)
-- ===================================================================

-- 4 Rivers — migration 017: co-leaders
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A group's leader can make a member a co-leader. A co-leader can use the
-- leader tools inside that group (verse of the day, reading plan, removing
-- members and moderating chat and prayers). A co-leader is still an ordinary
-- learner everywhere else: they cannot start groups of their own (only an
-- admin can approve new leaders), cannot rename or delete the group, change
-- its code, or make or remove other co-leaders.

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

-- ===================================================================
-- Part 3 of 3: the reading plan function, final version (from old file 018)
-- ===================================================================

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
