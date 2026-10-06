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
