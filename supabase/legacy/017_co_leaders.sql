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
