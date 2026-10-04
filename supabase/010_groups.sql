-- 4 Rivers — migration 010: Small Groups
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups).
--
-- A group is a name, a join code, a leader, and an optional "this week's
-- focus" module. Privacy rule: nobody can read another person's progress,
-- notes, or results. The only numbers a group ever sees are GROUP totals
-- (how many members, how many have read this week's lesson, and so on),
-- produced by group_overview() below. Everything is derived from the
-- existing per-user tables at read time; nothing is copied or counted here.

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique,
  leader_id uuid not null references auth.users(id) on delete cascade,
  -- This week's focus: matches module_views (section + module_index).
  focus_section text check (focus_section in ('introduction', '1', '2', '3', '4')),
  focus_module int check (focus_module >= 0),
  focus_note text check (focus_note is null or char_length(focus_note) <= 400),
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the name given at join time; the live profile name wins when set.
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user on group_members (user_id);

alter table groups enable row level security;
alter table group_members enable row level security;

-- Membership check as a function so policies don't recurse into themselves.
create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = auth.uid()
  );
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
create policy "Leaders can delete their groups"
  on groups for delete
  using (leader_id = auth.uid());

-- Groups and memberships are created only through the functions below.

drop policy if exists "Members can read their group's roster" on group_members;
create policy "Members can read their group's roster"
  on group_members for select
  using (user_id = auth.uid() or is_group_member(group_id));

-- Leave a group yourself, or (as leader) remove someone else.
drop policy if exists "Leave a group or remove a member" on group_members;
create policy "Leave a group or remove a member"
  on group_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from groups g where g.id = group_id and g.leader_id = auth.uid())
  );

-- ------------------------------------------------------------------ --
-- create_group: makes the group, a short join code, and the leader's own
-- membership in one step.
-- ------------------------------------------------------------------ --
create or replace function create_group(p_name text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code text;
  g groups;
  i int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from groups where leader_id = auth.uid()) >= 10 then
    raise exception 'too many groups';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from groups where join_code = code);
  end loop;
  insert into groups (name, join_code, leader_id)
    values (left(trim(p_name), 60), code, auth.uid())
    returning * into g;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60));
  return g;
end;
$$;

-- ------------------------------------------------------------------ --
-- join_group: look a group up by its code and add the caller to it.
-- ------------------------------------------------------------------ --
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
  select * into g from groups where join_code = upper(trim(p_code));
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

-- ------------------------------------------------------------------ --
-- group_overview: the roster (names only) and GROUP-LEVEL totals.
-- Callable only by a member. No per-person progress is ever returned.
-- ------------------------------------------------------------------ --
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
  if not exists (
    select 1 from group_members where group_id = p_group and user_id = auth.uid()
  ) then
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
    ), '[]'::json),
    'member_count', (select count(*) from group_members where group_id = p_group),
    'focus_readers', (
      select count(*) from group_members m
      join groups g on g.id = m.group_id
      where m.group_id = p_group
        and g.focus_section is not null
        and exists (
          select 1 from module_views v
          where v.user_id = m.user_id
            and v.section = g.focus_section
            and v.module_index = g.focus_module
        )
    ),
    'modules_read', (
      select count(*) from module_views v
      where v.user_id in (select user_id from group_members where group_id = p_group)
    ),
    'finished', (
      select count(*) from profiles p
      where p.user_id in (select user_id from group_members where group_id = p_group)
        and p.exam_passed_at is not null
    )
  ) into result;

  return result;
end;
$$;

grant execute on function create_group(text, text) to authenticated;
grant execute on function join_group(text, text) to authenticated;
grant execute on function group_overview(uuid) to authenticated;
