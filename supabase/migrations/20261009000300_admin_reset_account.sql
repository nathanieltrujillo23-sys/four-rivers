-- 4 Rivers: an admin can reset any account's course progress.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Clears one person's rivers, modules read, quiz and exam results, certificate, 30-Day Challenge, and tracker entries, so
-- they start the course again. Their journal, lesson feedback, groups, and saved calculator scenarios are kept, exactly as
-- when someone resets their own account from the Tools tab. Only an admin can call it.

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
  update profiles
     set exam_passed_at = null, exam_best_score = null, challenge_started_at = null
   where user_id = p_user;
end;
$$;
grant execute on function admin_reset_account(uuid) to authenticated;
