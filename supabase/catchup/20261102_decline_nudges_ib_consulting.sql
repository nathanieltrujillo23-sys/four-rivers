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
-- 4 Rivers: a shared recruiting calendar (entered by an admin), a practice-partner board, and an anonymous usage summary for admins.
-- Run once in the Supabase SQL editor. Safe to re-run. Builds on 20261102000300_ib_consulting.sql.

-- ------------------------------------------------------------------ --
-- Recruiting windows: an admin enters them, people approved for that tool read them
-- ------------------------------------------------------------------ --
create table if not exists recruiting_windows (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('ib', 'consulting')),
  firm text not null check (char_length(firm) between 1 and 120),
  role text not null default '' check (char_length(role) <= 120),
  opens date,
  closes date,
  -- The day an admin last looked at the firm's own careers page: these change, so this is always shown.
  checked_on date not null,
  url text not null default '' check (char_length(url) <= 300),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists recruiting_windows_track_idx on recruiting_windows (track, closes);
alter table recruiting_windows enable row level security;

drop policy if exists "Read recruiting windows" on recruiting_windows;
create policy "Read recruiting windows" on recruiting_windows for select using (has_track_access(track));
-- No insert, update or delete policies: the two admin functions below are the only way to write.

create or replace function admin_save_recruiting_window(
  p_id uuid, p_track text, p_firm text, p_role text, p_opens date, p_closes date, p_checked date, p_url text, p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  if p_track not in ('ib', 'consulting') then
    raise exception 'unknown tool';
  end if;
  if p_id is null then
    insert into recruiting_windows (track, firm, role, opens, closes, checked_on, url, notes)
    values (p_track, trim(p_firm), coalesce(trim(p_role), ''), p_opens, p_closes, coalesce(p_checked, current_date), coalesce(trim(p_url), ''), coalesce(trim(p_notes), ''))
    returning id into v_id;
  else
    update recruiting_windows
       set track = p_track, firm = trim(p_firm), role = coalesce(trim(p_role), ''), opens = p_opens, closes = p_closes,
           checked_on = coalesce(p_checked, current_date), url = coalesce(trim(p_url), ''), notes = coalesce(trim(p_notes), '')
     where id = p_id
     returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function admin_delete_recruiting_window(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  delete from recruiting_windows where id = p_id;
end;
$$;

-- ------------------------------------------------------------------ --
-- The practice-partner board
-- ------------------------------------------------------------------ --
create table if not exists practice_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('ib', 'consulting')),
  topic text not null check (char_length(topic) between 1 and 140),
  when_text text not null default '' check (char_length(when_text) <= 140),
  -- How the person wants to be reached. Only the poster, and people who offered to practice, ever see it.
  contact text not null default '' check (char_length(contact) <= 160),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists practice_posts_track_idx on practice_posts (track, created_at desc);
create table if not exists practice_responses (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references practice_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 160),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table practice_posts enable row level security;
alter table practice_responses enable row level security;
-- Everything goes through the functions below, which decide what each person may see; the tables themselves are not readable.

create or replace function post_practice(p_track text, p_topic text, p_when text, p_contact text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or p_track not in ('ib', 'consulting') or not has_track_access(p_track) then
    raise exception 'not allowed';
  end if;
  if (select count(*) from practice_posts where user_id = auth.uid() and closed_at is null) >= 5 then
    raise exception 'you already have five open requests; close one first';
  end if;
  insert into practice_posts (user_id, track, topic, when_text, contact)
  values (auth.uid(), p_track, trim(p_topic), coalesce(trim(p_when), ''), coalesce(trim(p_contact), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function close_practice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  update practice_posts set closed_at = coalesce(closed_at, now()) where id = p_id and (user_id = auth.uid() or is_admin());
end;
$$;

create or replace function respond_practice(p_post uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track text;
  v_owner uuid;
begin
  select track, user_id into v_track, v_owner from practice_posts where id = p_post and closed_at is null;
  if v_track is null or auth.uid() is null or not has_track_access(v_track) then
    raise exception 'not allowed';
  end if;
  if v_owner = auth.uid() then
    raise exception 'that is your own request';
  end if;
  insert into practice_responses (post_id, user_id, note) values (p_post, auth.uid(), coalesce(trim(p_note), ''))
  on conflict (post_id, user_id) do update set note = excluded.note;
end;
$$;

create or replace function withdraw_practice_response(p_post uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from practice_responses where post_id = p_post and user_id = auth.uid();
$$;

-- The board: open requests for one tool. Contact details show only to the poster, and to a person who offered to practice.
create or replace function practice_board(p_track text)
returns table (id uuid, author text, is_mine boolean, topic text, when_text text, contact text, created_at timestamptz, responses bigint, i_responded boolean)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not has_track_access(p_track) then
    raise exception 'not allowed';
  end if;
  return query
    select p.id,
           coalesce(nullif(trim(pr.display_name), ''), 'A student'),
           p.user_id = auth.uid(),
           p.topic,
           p.when_text,
           case when p.user_id = auth.uid() or exists (select 1 from practice_responses r where r.post_id = p.id and r.user_id = auth.uid()) then p.contact else '' end,
           p.created_at,
           (select count(*) from practice_responses r where r.post_id = p.id),
           exists (select 1 from practice_responses r where r.post_id = p.id and r.user_id = auth.uid())
    from practice_posts p
    left join profiles pr on pr.user_id = p.user_id
    where p.track = p_track and p.closed_at is null
    order by p.created_at desc
    limit 60;
end;
$$;

-- Who offered to practice, for the poster of a request.
create or replace function practice_responders(p_post uuid)
returns table (name text, note text, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (select 1 from practice_posts where id = p_post and user_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  return query
    select coalesce(nullif(trim(pr.display_name), ''), 'A student'), r.note, r.created_at
    from practice_responses r left join profiles pr on pr.user_id = r.user_id
    where r.post_id = p_post
    order by r.created_at;
end;
$$;

-- ------------------------------------------------------------------ --
-- An anonymous usage summary for admins: counts only, never who
-- ------------------------------------------------------------------ --
create or replace function admin_tool_usage()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '30 days';
  v_sum int;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  return json_build_object(
    'approved', json_build_object(
      'leader', (select count(*) from profiles where leader_status = 'approved'),
      'wealth', (select count(*) from profiles where wealth_status = 'approved'),
      'ib', (select count(*) from profiles where ib_status = 'approved'),
      'consulting', (select count(*) from profiles where consulting_status = 'approved')
    ),
    'waiting', json_build_object(
      'leader', (select count(*) from profiles where leader_status = 'requested'),
      'wealth', (select count(*) from profiles where wealth_status = 'requested'),
      'ib', (select count(*) from profiles where ib_status = 'requested'),
      'consulting', (select count(*) from profiles where consulting_status = 'requested')
    ),
    'active30', json_build_object(
      'wealth', (select count(distinct user_id) from wealth_clients where updated_at > v_since),
      'ib', (select count(*) from ib_workspaces where updated_at > v_since),
      'consulting', (select count(*) from consulting_workspaces where updated_at > v_since)
    ),
    'wealth', json_build_object(
      'plans', (select count(*) from wealth_clients),
      'versions', (select count(*) from wealth_versions),
      'cases', (select count(*) from wealth_cases),
      'reviews', (select count(*) from wealth_case_reviews),
      'prepDocs', (select count(*) from wealth_prep)
    ),
    'ib', json_build_object(
      'deals', coalesce((select sum(jsonb_array_length(coalesce(data -> 'deals', '[]'::jsonb))) from ib_workspaces), 0),
      'firms', coalesce((select sum(jsonb_array_length(coalesce(data -> 'recruits', '[]'::jsonb))) from ib_workspaces), 0),
      'questionsRated', coalesce((select sum((select count(*) from jsonb_object_keys(coalesce(data -> 'tech', '{}'::jsonb)))) from ib_workspaces), 0)
    ),
    'consulting', json_build_object(
      'cases', coalesce((select sum(jsonb_array_length(coalesce(data -> 'cases', '[]'::jsonb))) from consulting_workspaces), 0),
      'drills', coalesce((select sum(jsonb_array_length(coalesce(data -> 'drills', '[]'::jsonb))) from consulting_workspaces), 0),
      'firms', coalesce((select sum(jsonb_array_length(coalesce(data -> 'recruits', '[]'::jsonb))) from consulting_workspaces), 0)
    ),
    'practice', json_build_object(
      'open', (select count(*) from practice_posts where closed_at is null),
      'offers', (select count(*) from practice_responses)
    ),
    'windows', (select count(*) from recruiting_windows)
  );
end;
$$;

grant execute on function admin_save_recruiting_window(uuid, text, text, text, date, date, date, text, text) to authenticated;
grant execute on function admin_delete_recruiting_window(uuid) to authenticated;
grant execute on function post_practice(text, text, text, text) to authenticated;
grant execute on function close_practice(uuid) to authenticated;
grant execute on function respond_practice(uuid, text) to authenticated;
grant execute on function withdraw_practice_response(uuid) to authenticated;
grant execute on function practice_board(text) to authenticated;
grant execute on function practice_responders(uuid) to authenticated;
grant execute on function admin_tool_usage() to authenticated;
