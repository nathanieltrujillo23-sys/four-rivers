-- 4 Rivers: Update 40. Spaced review: a few of a river's quiz questions come back 1, 7 and 30 days after it was passed.
-- Run once in the Supabase SQL editor, after 20261116000100_pace_and_practice.sql. Safe to re-run.
--
-- When a review is due is worked out from course_progress.quiz_passed_at, so only finished reviews are stored: one row
-- per (learner, river, round), private to its owner.

create table if not exists quiz_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  river int not null check (river between 1 and 4),
  round int not null check (round between 1 and 3),
  score int not null check (score between 0 and 3),
  done_at timestamptz not null default now(),
  primary key (user_id, river, round)
);
alter table quiz_reviews enable row level security;

drop policy if exists "Own reviews: read" on quiz_reviews;
create policy "Own reviews: read" on quiz_reviews for select using (user_id = auth.uid());
drop policy if exists "Own reviews: add" on quiz_reviews;
create policy "Own reviews: add" on quiz_reviews for insert with check (user_id = auth.uid());
drop policy if exists "Own reviews: change" on quiz_reviews;
create policy "Own reviews: change" on quiz_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Own reviews: remove" on quiz_reviews;
create policy "Own reviews: remove" on quiz_reviews for delete using (user_id = auth.uid());

-- An admin reset clears them too.
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
  delete from quiz_reviews where user_id = p_user;
  update profiles
     set exam_passed_at = null, exam_best_score = null, challenge_started_at = null,
         pace_days = null, pace_note = false, practice_started_at = null
   where user_id = p_user;
end;
$$;
grant execute on function admin_reset_account(uuid) to authenticated;
