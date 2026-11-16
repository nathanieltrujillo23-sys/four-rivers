-- 4 Rivers: Update 38. The 30-Day Challenge becomes a pace choice, and 30 Days of Practice follows the course.
-- Run once in the Supabase SQL editor, after 20261114000300_wealth_model_review.sql. Safe to re-run.
--
-- Pace: a learner picks one week (7), two weeks (14) or their own pace (0). challenge_started_at keeps meaning "the
-- day the plan started"; what is done is still worked out from real progress, never stored.
-- Anyone partway through the old 30-day challenge moves to the two-week pace starting today, keeps every finished
-- task, and sees a one-time note (pace_note) explaining the change.
--
-- Practice: after the course, 30 small daily actions. practice_started_at marks the start; each day checked off is a
-- row in practice_checkins, with an optional short note that only its owner can read.

alter table profiles add column if not exists pace_days int;
alter table profiles drop constraint if exists profiles_pace_days_check;
alter table profiles add constraint profiles_pace_days_check check (pace_days in (0, 7, 14));
alter table profiles add column if not exists pace_note boolean not null default false;
alter table profiles add column if not exists practice_started_at timestamptz;

-- Move the old challenge onto the two-week pace (only rows not moved yet, so re-running changes nothing).
update profiles
   set pace_days = 14,
       challenge_started_at = case when exam_passed_at is null then now() else challenge_started_at end,
       pace_note = exam_passed_at is null
 where challenge_started_at is not null
   and pace_days is null;

create table if not exists practice_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null check (day between 1 and 30),
  done_at timestamptz not null default now(),
  note text not null default '' check (char_length(note) <= 500),
  primary key (user_id, day)
);
alter table practice_checkins enable row level security;

drop policy if exists "Own practice: read" on practice_checkins;
create policy "Own practice: read" on practice_checkins for select using (user_id = auth.uid());
drop policy if exists "Own practice: add" on practice_checkins;
create policy "Own practice: add" on practice_checkins for insert with check (user_id = auth.uid());
drop policy if exists "Own practice: change" on practice_checkins;
create policy "Own practice: change" on practice_checkins for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Own practice: remove" on practice_checkins;
create policy "Own practice: remove" on practice_checkins for delete using (user_id = auth.uid());

-- An admin reset also clears the pace and the practice days.
create or replace function admin_reset_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from profiles where user_id = p_user) then
    raise exception 'no such account';
  end if;
  delete from course_progress where user_id = p_user;
  delete from module_views where user_id = p_user;
  delete from certificate_verifications where user_id = p_user;
  delete from savings_contributions where user_id = p_user;
  delete from savings_goals where user_id = p_user;
  delete from income_streams where user_id = p_user;
  delete from investment_entries where user_id = p_user;
  delete from giving_entries where user_id = p_user;
  delete from practice_checkins where user_id = p_user;
  update profiles
     set exam_passed_at = null, exam_best_score = null, challenge_started_at = null,
         pace_days = null, pace_note = false, practice_started_at = null
   where user_id = p_user;
end;
$$;
grant execute on function admin_reset_account(uuid) to authenticated;
