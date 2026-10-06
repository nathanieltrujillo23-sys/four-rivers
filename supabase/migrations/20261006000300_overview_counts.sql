-- 4 Rivers: four more counts on the Admin overview (prayers answered, reading check-offs, lessons read, tracker entries),
-- and the analytics funnel's "read a lesson" now counts people from both the module log and the river progress rows.
-- Run once in the Supabase SQL editor, AFTER 20261006000200. Safe to re-run.

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
    'prayers', (select count(*) from group_prayers),
    'prayers_answered', (select count(*) from group_prayers where answered_at is not null),
    'reading_checks', (select count(*) from group_reading_checks),
    'modules_read', (select count(*) from module_views),
    'tracker_entries',
      (select count(*) from income_streams)
      + (select count(*) from savings_contributions)
      + (select count(*) from investment_entries)
      + (select count(*) from giving_entries)
  );
end;
$$;
grant execute on function admin_overview() to authenticated;

-- "Read a lesson" in the analytics funnel: anyone with a module read OR a river started (older accounts only have the latter).
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
    'started', (
      select count(*) from (
        select user_id from module_views
        union
        select user_id from course_progress where lesson_viewed_at is not null
      ) u
    ),
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
