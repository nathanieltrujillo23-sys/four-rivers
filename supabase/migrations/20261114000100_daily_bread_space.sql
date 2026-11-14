-- 4 Rivers: the Daily Bread members' space (daily readings and the prayer wall, beside the three tool sets).
-- Run once in the Supabase SQL editor. Safe to re-run. Builds on the groups, profiles and tool-access migrations.
--
-- The Daily Bread space is one special group. It reuses everything a group already has (the reading plan, verse of the
-- day, prayer wall and chat), but nobody joins it with a code: people who are approved for Wealth, Investment Banking or
-- Consulting Tools (and admins) are added when they open the space. An admin makes the group once, from the space itself.

alter table groups
  add column if not exists daily_bread boolean not null default false;

-- Only one Daily Bread group can exist.
create unique index if not exists groups_one_daily_bread on groups ((true)) where daily_bread;

-- The flag is set only by the function below, never edited by a leader.
create or replace function protect_daily_bread()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.daily_bread is distinct from old.daily_bread then
    raise exception 'only the site owner can change this';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_daily_bread on groups;
create trigger protect_daily_bread
  before update on groups
  for each row execute function protect_daily_bread();

-- Is the signed-in person a Daily Bread member: approved for any of the three tool sets, or an admin?
create or replace function is_daily_bread_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid()
      and (role = 'admin' or wealth_status = 'approved' or ib_status = 'approved' or consulting_status = 'approved')
  );
$$;

-- An admin makes the group once. It is closed to codes (joining is off), and the admin leads it.
create or replace function admin_create_daily_bread_group(p_display_name text)
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
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  select * into g from groups where daily_bread;
  if found then
    return g;
  end if;
  loop
    code := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from groups where join_code = code);
    tries := tries + 1;
    if tries > 200 then
      raise exception 'no codes available';
    end if;
  end loop;
  insert into groups (name, join_code, leader_id, daily_bread, join_enabled)
    values ('Daily Bread', code, auth.uid(), true, false)
    returning * into g;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60))
    on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

-- Opening the space adds a member to the group (once) and returns it; null means no admin has made it yet.
create or replace function join_daily_bread(p_display_name text)
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
  if not is_daily_bread_member() then
    raise exception 'not allowed';
  end if;
  select * into g from groups where daily_bread and archived_at is null;
  if not found then
    return null;
  end if;
  insert into group_members (group_id, user_id, display_name)
    values (g.id, auth.uid(), left(coalesce(trim(p_display_name), ''), 60))
    on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

grant execute on function is_daily_bread_member() to authenticated;
grant execute on function admin_create_daily_bread_group(text) to authenticated;
grant execute on function join_daily_bread(text) to authenticated;
