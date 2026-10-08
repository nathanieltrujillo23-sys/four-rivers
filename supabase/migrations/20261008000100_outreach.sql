-- 4 Rivers: Outreach (bulk invitations for church and campus leaders).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- An admin pastes a list of email addresses. Each is recorded here; anyone who already has an account is approved
-- as a group leader straight away, and anyone who signs up later with that address is approved the moment they do.

create table if not exists leader_invites (
  email text primary key check (email = lower(email)),
  approve boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table leader_invites enable row level security;
-- No policies: only the functions below touch it.

-- A new account whose address was invited (with approval) starts as an approved leader.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invited boolean;
begin
  select approve into invited from leader_invites where email = lower(new.email) and approve;
  insert into public.profiles (user_id, display_name, full_name, leader_status)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when coalesce(invited, false) then 'approved' else 'none' end
  );
  if coalesce(invited, false) then
    update leader_invites set accepted_at = now() where email = lower(new.email);
  end if;
  return new;
end;
$$;

-- Admin: record a list of invitations. Returns how many were new, how many already had accounts, and how many of
-- those were approved on the spot.
create or replace function admin_apply_leader_invites(p_emails text[], p_approve boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  e text;
  cleaned text[];
  uid uuid;
  total int := 0;
  with_account int := 0;
  approved_now int := 0;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  select coalesce(array_agg(distinct lower(trim(x))), '{}')
    into cleaned
    from unnest(p_emails) x
   where trim(x) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  if coalesce(array_length(cleaned, 1), 0) > 200 then
    raise exception 'at most 200 at a time';
  end if;
  foreach e in array cleaned loop
    total := total + 1;
    insert into leader_invites (email, approve, invited_by)
    values (e, p_approve, auth.uid())
    on conflict (email) do update set approve = excluded.approve, invited_by = excluded.invited_by,
      created_at = now(), accepted_at = case when leader_invites.accepted_at is not null then leader_invites.accepted_at else null end;
    select id into uid from auth.users where lower(email) = e limit 1;
    if uid is not null then
      with_account := with_account + 1;
      if p_approve then
        update profiles set leader_status = 'approved' where user_id = uid and leader_status <> 'approved';
        update leader_invites set accepted_at = now() where email = e;
        approved_now := approved_now + 1;
      end if;
    end if;
  end loop;
  return json_build_object('total', total, 'with_account', with_account, 'approved_now', approved_now,
                           'pending', total - approved_now);
end;
$$;
grant execute on function admin_apply_leader_invites(text[], boolean) to authenticated;

create or replace function admin_leader_invites()
returns table (email text, approve boolean, created_at timestamptz, accepted_at timestamptz)
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
    select i.email, i.approve, i.created_at, i.accepted_at
    from leader_invites i order by i.created_at desc limit 300;
end;
$$;
grant execute on function admin_leader_invites() to authenticated;

create or replace function admin_cancel_leader_invite(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  delete from leader_invites where email = lower(trim(p_email)) and accepted_at is null;
end;
$$;
grant execute on function admin_cancel_leader_invite(text) to authenticated;
