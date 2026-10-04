-- 4 Rivers — migration 016: group reading plan calendar
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A leader can lay a whole Bible reading plan across a date range; each
-- day's reading shows on the group's calendar. Members can read the plan;
-- only the group's leader can set or clear it, and only through
-- set_group_plan(), which replaces the whole plan in one step.

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
