-- 4 Rivers — migration 018: reading plan progress
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Members tick off each day's reading and everyone in the group can see who
-- has done it. A tick is keyed by the reading's date; only you can add or
-- remove your own. Setting a new plan clears the old ticks.

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
      'today', c.today
    ))
    from (
      select user_id,
             count(*) as total,
             bool_or(read_on = p_date) as today
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
