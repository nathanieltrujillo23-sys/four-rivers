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
