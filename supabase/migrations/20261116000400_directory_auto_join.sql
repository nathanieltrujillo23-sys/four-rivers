-- 4 Rivers: Update 44. Daily Bread members are listed in the member directory as soon as they join.
-- Run once in the Supabase SQL editor, after 20261116000300_delete_my_account.sql. Safe to re-run.
--
-- "Joining" is the moment someone becomes a Daily Bread member: their first tool set (Wealth, Investment Banking or
-- Consulting) is approved, or they become an admin. At that moment they're listed. They can still remove themselves
-- from the directory page, and that choice sticks (directory_chosen): only a new joining, after losing every tool set,
-- lists them again. The directory still shows only a name, a picture, their own line and their tool sets; never an
-- email address.

alter table profiles add column if not exists directory_chosen boolean not null default false;

create or replace function directory_on_join()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  was_member boolean := old.role = 'admin' or old.wealth_status = 'approved' or old.ib_status = 'approved' or old.consulting_status = 'approved';
  is_member boolean := new.role = 'admin' or new.wealth_status = 'approved' or new.ib_status = 'approved' or new.consulting_status = 'approved';
begin
  if coalesce(is_member, false) and not coalesce(was_member, false) then
    new.directory_opt_in := true;
    new.directory_chosen := false;
  end if;
  return new;
end;
$$;

drop trigger if exists directory_on_join on profiles;
create trigger directory_on_join
  before update on profiles
  for each row execute function directory_on_join();

-- A member's own choice (listing, editing the line, or removing themselves) is remembered.
create or replace function set_directory_entry(p_show boolean, p_line text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not is_daily_bread_member() then
    raise exception 'not allowed';
  end if;
  update profiles
    set directory_opt_in = coalesce(p_show, false),
        directory_line = left(coalesce(trim(p_line), ''), 140),
        directory_chosen = true
    where user_id = auth.uid();
end;
$$;
grant execute on function set_directory_entry(boolean, text) to authenticated;

-- Members who joined before this rule are listed now, unless they have made their own choice since.
update profiles
   set directory_opt_in = true
 where not directory_opt_in
   and not directory_chosen
   and (role = 'admin' or wealth_status = 'approved' or ib_status = 'approved' or consulting_status = 'approved');
