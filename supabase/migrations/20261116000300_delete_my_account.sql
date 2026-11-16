-- 4 Rivers: Update 42. A learner can delete their own account.
-- Run once in the Supabase SQL editor, after 20261116000200_quiz_reviews.sql. Safe to re-run.
--
-- Deleting the sign-in deletes everything tied to it (every table that belongs to a person cascades from auth.users):
-- progress, trackers, journal, practice, reviews, notes, scenarios, group memberships, messages and prayers.
-- Two guards:
--   * Admin accounts can't be deleted this way (an owner account must never vanish from one button).
--   * Someone who leads a group with other members must hand it over or delete it first, because a group goes with
--     its leader and the members would lose it.
-- The caller must pass the word DELETE, so a stray call can't do it.

create or replace function delete_my_account(p_confirm text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if p_confirm is distinct from 'DELETE' then
    raise exception 'confirmation required';
  end if;
  if exists (select 1 from public.profiles where user_id = v_user and role = 'admin') then
    raise exception 'admin accounts cannot be deleted here';
  end if;
  if exists (
    select 1
      from public.groups g
     where g.leader_id = v_user
       and exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id <> v_user)
  ) then
    raise exception 'leads a group with other members';
  end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function delete_my_account(text) from public;
grant execute on function delete_my_account(text) to authenticated;
