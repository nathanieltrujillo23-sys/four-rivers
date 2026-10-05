-- 4 Rivers — migration 012: admin learners list
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Lets an admin see every learner's name, email, and sign-up date in the
-- admin dashboard. Admin-only (it checks is_admin(), added in 011). It never
-- returns passwords or anything about their progress.

create or replace function admin_learners()
returns table (
  user_id uuid,
  display_name text,
  full_name text,
  email text,
  signed_up_at timestamptz
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
           u.created_at
    from auth.users u
    left join profiles p on p.user_id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_learners() to authenticated;
