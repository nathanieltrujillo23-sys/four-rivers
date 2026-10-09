-- 4 Rivers: analysts for the Discovery workshop (Daily Bread).
-- Run once in the Supabase SQL editor, after 20261009000100_discovery_workshop.sql. Safe to re-run.
--
-- In a group with the workshop on, the leader and any co-leader can make an ordinary member an "analyst". An analyst can
-- use the Discovery workshop and sees only the meetings they took themselves (the group's owner still sees them all).
-- Analysts get no other leader powers.

alter table group_members
  add column if not exists is_analyst boolean not null default false;

create or replace function is_group_analyst(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and is_analyst);
$$;

-- The owner reads every meeting; a co-leader or analyst reads and changes only their own.
create or replace function can_use_workshop(gid uuid, creator uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from groups g
    where g.id = gid
      and g.workshop_enabled
      and (
        g.leader_id = auth.uid()
        or (creator = auth.uid() and (is_group_manager(gid) or is_group_analyst(gid)))
      )
  );
$$;

-- The leader or a co-leader names (or un-names) an analyst. Not for a plain group: the workshop must be on.
create or replace function set_analyst(p_group uuid, p_user uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_manager(p_group) then
    raise exception 'only a leader or co-leader can name analysts';
  end if;
  if not exists (select 1 from groups where id = p_group and workshop_enabled) then
    raise exception 'the workshop is not on for this group';
  end if;
  if exists (select 1 from groups where id = p_group and leader_id = p_user) then
    raise exception 'the leader already has the workshop';
  end if;
  update group_members set is_analyst = p_value where group_id = p_group and user_id = p_user;
  if not found then
    raise exception 'that person is not in the group';
  end if;
end;
$$;
grant execute on function set_analyst(uuid, uuid, boolean) to authenticated;

-- The roster now says who the analysts are.
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
        'is_analyst', m.is_analyst,
        'joined_at', m.joined_at,
        'avatar', p.avatar
      ) order by (m.user_id = g.leader_id) desc, m.is_co_leader desc, m.is_analyst desc, m.joined_at)
      from group_members m
      join groups g on g.id = m.group_id
      left join profiles p on p.user_id = m.user_id
      where m.group_id = p_group
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;
