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
