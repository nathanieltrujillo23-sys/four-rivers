-- 4 Rivers: more account notices. A declined request (with an optional reason from the admin), a nudge for a new leader who has not
-- made a group yet, and a count of waiting requests for admins.
-- Run once in the Supabase SQL editor. Safe to re-run. Builds on 20261019000100_approval_notices.sql.

alter table account_notices
  add column if not exists note text check (note is null or char_length(note) <= 300),
  add column if not exists emailed_at timestamptz;

alter table account_notices drop constraint if exists account_notices_kind_check;
alter table account_notices add constraint account_notices_kind_check check (kind in (
  'leader_approved', 'wealth_approved', 'ib_approved', 'consulting_approved',
  'leader_declined', 'wealth_declined', 'ib_declined', 'consulting_declined',
  'leader_no_group'
));

alter table profiles add column if not exists leader_nudge_sent_at timestamptz;

create or replace function my_account_notices()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(json_agg(n order by n.created_at desc), '[]'::json)
  from (
    select id, kind, note, created_at, (seen_at is null) as unread
    from account_notices
    where user_id = auth.uid()
    order by created_at desc
    limit 20
  ) n;
$$;
grant execute on function my_account_notices() to authenticated;

-- Declines a pending request and tells the person, with a short reason if the admin gives one. It only acts on a request that is
-- still waiting; taking access away from someone already approved is done with admin_set_leader / admin_set_wealth.
create or replace function admin_decline_request(p_kind text, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed int;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if p_kind = 'leader' then
    perform set_config('app.leader_rpc', 'on', true);
    update profiles set leader_status = 'none' where user_id = p_user and leader_status = 'requested';
  elsif p_kind = 'wealth' then
    perform set_config('app.wealth_rpc', 'on', true);
    update profiles set wealth_status = 'none' where user_id = p_user and wealth_status = 'requested';
  else
    raise exception 'unknown kind';
  end if;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into account_notices (user_id, kind, note)
    values (p_user, p_kind || '_declined', nullif(left(trim(coalesce(p_reason, '')), 300), ''));
  end if;
end;
$$;
grant execute on function admin_decline_request(text, uuid, text) to authenticated;

-- How many requests are waiting, for the admin's bell.
create or replace function admin_pending_counts()
returns table (kind text, waiting bigint)
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
    select 'leader'::text, count(*) from profiles where leader_status = 'requested'
    union all
    select 'wealth'::text, count(*) from profiles where wealth_status = 'requested';
end;
$$;
grant execute on function admin_pending_counts() to authenticated;

-- The daily job calls this (with the service role key; nobody else can). It finds approved leaders who were approved at least p_days
-- ago and still have no group, adds a nudge to their bell, marks them so they are nudged once, and returns who to email.
create or replace function claim_leader_nudges(p_days int)
returns table (user_id uuid, email text, display_name text, lang text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with due as (
      select p.user_id
      from profiles p
      where p.leader_status = 'approved'
        and p.leader_nudge_sent_at is null
        and exists (
          select 1 from account_notices n
          where n.user_id = p.user_id and n.kind = 'leader_approved' and n.created_at <= now() - make_interval(days => p_days)
        )
        and not exists (select 1 from groups g where g.leader_id = p.user_id)
    ),
    upd as (
      update profiles set leader_nudge_sent_at = now()
      where profiles.user_id in (select due.user_id from due)
      returning profiles.user_id, profiles.display_name, profiles.reminder_lang
    ),
    ins as (
      insert into account_notices (user_id, kind) select upd.user_id, 'leader_no_group' from upd
    )
    select upd.user_id, u.email::text, coalesce(nullif(trim(upd.display_name), ''), ''), coalesce(upd.reminder_lang, 'en')
    from upd join auth.users u on u.id = upd.user_id;
end;
$$;
revoke all on function claim_leader_nudges(int) from public, anon, authenticated;
grant execute on function claim_leader_nudges(int) to service_role;
-- 4 Rivers: two more community tools anyone can request and an admin approves, after leader status and Wealth Tools:
-- Investment Banking Tools ("ib") and Consulting Tools ("consulting"). Each is a private, educational workspace.
-- Run once in the Supabase SQL editor. Safe to re-run. Builds on 20261102000100_notices_declines_nudges.sql.

alter table profiles
  add column if not exists ib_status text not null default 'none' check (ib_status in ('none', 'requested', 'approved')),
  add column if not exists ib_requested_at timestamptz,
  add column if not exists ib_note text,
  add column if not exists ib_request_notified_at timestamptz,
  add column if not exists consulting_status text not null default 'none' check (consulting_status in ('none', 'requested', 'approved')),
  add column if not exists consulting_requested_at timestamptz,
  add column if not exists consulting_note text,
  add column if not exists consulting_request_notified_at timestamptz;

-- A person's status can only change through the functions below (or from the SQL editor), like leader and Wealth Tools status.
create or replace function protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'not allowed';
    end if;
    if new.leader_status is distinct from old.leader_status
       and coalesce(current_setting('app.leader_rpc', true), '') <> 'on' then
      raise exception 'not allowed';
    end if;
    if new.wealth_status is distinct from old.wealth_status
       and coalesce(current_setting('app.wealth_rpc', true), '') <> 'on' then
      raise exception 'not allowed';
    end if;
    if new.ib_status is distinct from old.ib_status
       and coalesce(current_setting('app.ib_rpc', true), '') <> 'on' then
      raise exception 'not allowed';
    end if;
    if new.consulting_status is distinct from old.consulting_status
       and coalesce(current_setting('app.consulting_rpc', true), '') <> 'on' then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end;
$$;

-- Asking: one function for both tools.
create or replace function request_track_access(p_kind text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_kind = 'ib' then
    perform set_config('app.ib_rpc', 'on', true);
    update profiles set ib_status = 'requested', ib_requested_at = now(), ib_note = left(trim(coalesce(p_note, '')), 300)
      where user_id = auth.uid() and ib_status = 'none';
  elsif p_kind = 'consulting' then
    perform set_config('app.consulting_rpc', 'on', true);
    update profiles set consulting_status = 'requested', consulting_requested_at = now(), consulting_note = left(trim(coalesce(p_note, '')), 300)
      where user_id = auth.uid() and consulting_status = 'none';
  else
    raise exception 'unknown kind';
  end if;
end;
$$;

-- Approving or taking access away (an admin only).
create or replace function admin_set_track_access(p_kind text, p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if p_kind = 'ib' then
    perform set_config('app.ib_rpc', 'on', true);
    update profiles set ib_status = case when p_approve then 'approved' else 'none' end where user_id = p_user;
  elsif p_kind = 'consulting' then
    perform set_config('app.consulting_rpc', 'on', true);
    update profiles set consulting_status = case when p_approve then 'approved' else 'none' end where user_id = p_user;
  else
    raise exception 'unknown kind';
  end if;
end;
$$;

-- The admin's list: who is waiting and who is approved.
create or replace function admin_track_requests(p_kind text)
returns table (user_id uuid, display_name text, email text, note text, status text, requested_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if p_kind = 'ib' then
    return query
      select p.user_id, coalesce(nullif(trim(p.display_name), ''), ''), u.email::text, p.ib_note, p.ib_status, p.ib_requested_at
      from profiles p join auth.users u on u.id = p.user_id
      where p.ib_status in ('requested', 'approved')
      order by (p.ib_status = 'requested') desc, p.ib_requested_at desc nulls last;
  elsif p_kind = 'consulting' then
    return query
      select p.user_id, coalesce(nullif(trim(p.display_name), ''), ''), u.email::text, p.consulting_note, p.consulting_status, p.consulting_requested_at
      from profiles p join auth.users u on u.id = p.user_id
      where p.consulting_status in ('requested', 'approved')
      order by (p.consulting_status = 'requested') desc, p.consulting_requested_at desc nulls last;
  else
    raise exception 'unknown kind';
  end if;
end;
$$;

-- Approved people and admins may use each workspace.
create or replace function has_track_access(p_kind text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid()
      and (role = 'admin' or (p_kind = 'ib' and ib_status = 'approved') or (p_kind = 'consulting' and consulting_status = 'approved'))
  );
$$;

-- Each person's private workspace for each tool: one document, readable only by them.
create table if not exists ib_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 800000),
  updated_at timestamptz not null default now()
);
create table if not exists consulting_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 800000),
  updated_at timestamptz not null default now()
);
alter table ib_workspaces enable row level security;
alter table consulting_workspaces enable row level security;

drop policy if exists "Read own ib workspace" on ib_workspaces;
create policy "Read own ib workspace" on ib_workspaces for select using (user_id = auth.uid() and has_track_access('ib'));
drop policy if exists "Read own consulting workspace" on consulting_workspaces;
create policy "Read own consulting workspace" on consulting_workspaces for select using (user_id = auth.uid() and has_track_access('consulting'));
-- No insert, update or delete policies: save_track_workspace is the only way to write.

create or replace function save_track_workspace(p_kind text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_track_access(p_kind) then
    raise exception 'not allowed';
  end if;
  if p_kind = 'ib' then
    insert into ib_workspaces (user_id, data, updated_at) values (auth.uid(), coalesce(p_data, '{}'::jsonb), now())
      on conflict (user_id) do update set data = excluded.data, updated_at = now();
  elsif p_kind = 'consulting' then
    insert into consulting_workspaces (user_id, data, updated_at) values (auth.uid(), coalesce(p_data, '{}'::jsonb), now())
      on conflict (user_id) do update set data = excluded.data, updated_at = now();
  else
    raise exception 'unknown kind';
  end if;
end;
$$;

-- Declines now cover all four kinds, the admin's waiting count covers them too, and approvals leave a notice.
create or replace function admin_decline_request(p_kind text, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed int;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if p_kind = 'leader' then
    perform set_config('app.leader_rpc', 'on', true);
    update profiles set leader_status = 'none' where user_id = p_user and leader_status = 'requested';
  elsif p_kind = 'wealth' then
    perform set_config('app.wealth_rpc', 'on', true);
    update profiles set wealth_status = 'none' where user_id = p_user and wealth_status = 'requested';
  elsif p_kind = 'ib' then
    perform set_config('app.ib_rpc', 'on', true);
    update profiles set ib_status = 'none' where user_id = p_user and ib_status = 'requested';
  elsif p_kind = 'consulting' then
    perform set_config('app.consulting_rpc', 'on', true);
    update profiles set consulting_status = 'none' where user_id = p_user and consulting_status = 'requested';
  else
    raise exception 'unknown kind';
  end if;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into account_notices (user_id, kind, note)
    values (p_user, p_kind || '_declined', nullif(left(trim(coalesce(p_reason, '')), 300), ''));
  end if;
end;
$$;

create or replace function admin_pending_counts()
returns table (kind text, waiting bigint)
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
    select 'leader'::text, count(*) from profiles where leader_status = 'requested'
    union all
    select 'wealth'::text, count(*) from profiles where wealth_status = 'requested'
    union all
    select 'ib'::text, count(*) from profiles where ib_status = 'requested'
    union all
    select 'consulting'::text, count(*) from profiles where consulting_status = 'requested';
end;
$$;

create or replace function note_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not distinct from auth.uid() then
    return new;
  end if;
  if new.leader_status = 'approved' and old.leader_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'leader_approved');
  end if;
  if new.wealth_status = 'approved' and old.wealth_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'wealth_approved');
  end if;
  if new.ib_status = 'approved' and old.ib_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'ib_approved');
  end if;
  if new.consulting_status = 'approved' and old.consulting_status is distinct from 'approved' then
    insert into account_notices (user_id, kind) values (new.user_id, 'consulting_approved');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_approval on profiles;
create trigger trg_note_approval
  after update of leader_status, wealth_status, ib_status, consulting_status on profiles
  for each row execute function note_approval();

grant execute on function request_track_access(text, text) to authenticated;
grant execute on function admin_set_track_access(text, uuid, boolean) to authenticated;
grant execute on function admin_track_requests(text) to authenticated;
grant execute on function has_track_access(text) to authenticated;
grant execute on function save_track_workspace(text, jsonb) to authenticated;
grant execute on function admin_decline_request(text, uuid, text) to authenticated;
grant execute on function admin_pending_counts() to authenticated;
