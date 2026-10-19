-- 4 Rivers: tell a person when an admin approves their request (group leader, or Wealth Tools).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Approving is done by the admin_set_leader / admin_set_wealth functions, which change the person's status on their profile.
-- A trigger on that change adds a notice for the person, so it happens every time, whoever or whatever makes the change.
-- The notice shows in the bell. (The email is sent by the app's server function api/approved.ts, which marks the *_approved_notified_at
-- columns so it is sent once.)

alter table profiles
  add column if not exists leader_approved_notified_at timestamptz,
  add column if not exists wealth_approved_notified_at timestamptz;

create table if not exists account_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('leader_approved', 'wealth_approved')),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists account_notices_user_idx on account_notices (user_id, created_at desc);
alter table account_notices enable row level security;

drop policy if exists "Read own notices" on account_notices;
create policy "Read own notices" on account_notices for select using (user_id = auth.uid());
-- No insert, update or delete policies: the trigger and the two functions below are the only way to write.

create or replace function note_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- An admin approving their own account does not need telling.
  if new.user_id is not distinct from auth.uid() then
    return new;
  end if;
  if new.leader_status = 'approved' and old.leader_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'leader_approved');
  end if;
  if new.wealth_status = 'approved' and old.wealth_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'wealth_approved');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_approval on profiles;
create trigger trg_note_approval
  after update of leader_status, wealth_status on profiles
  for each row execute function note_approval();

create or replace function my_account_notices()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(json_agg(n order by n.created_at desc), '[]'::json)
  from (
    select id, kind, created_at, (seen_at is null) as unread
    from account_notices
    where user_id = auth.uid()
    order by created_at desc
    limit 20
  ) n;
$$;

create or replace function mark_account_notices_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update account_notices set seen_at = now() where user_id = auth.uid() and seen_at is null;
$$;

grant execute on function my_account_notices() to authenticated;
grant execute on function mark_account_notices_seen() to authenticated;
