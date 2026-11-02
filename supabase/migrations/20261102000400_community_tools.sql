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
