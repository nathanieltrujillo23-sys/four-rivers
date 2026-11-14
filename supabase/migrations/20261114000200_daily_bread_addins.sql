-- 4 Rivers: the Daily Bread space gains a weekly brief, a member directory, and peer review of models.
-- Run once in the Supabase SQL editor, after 20261114000100_daily_bread_space.sql. Safe to re-run.
--
-- Three things, each readable only by Daily Bread members (people approved for a tool set, and admins):
--   1. A weekly brief written by an admin: a short market note, a reflection and a verse.
--   2. A directory that lists only the members who chose to appear, with one line they wrote and the tool sets they have.
--   3. Models shared for peer review in Investment Banking and Consulting Tools, with reviews that are private to the
--      reviewer, the author and admins (the same rule as the wealth case library).
-- There are no insert, update or delete policies: the functions below are the only way to write.

-- ------------------------------------------------------------------ --
-- 1. The weekly brief
-- ------------------------------------------------------------------ --
create table if not exists daily_bread_briefs (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  title text not null check (char_length(title) between 1 and 120),
  market text not null default '' check (char_length(market) <= 2000),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  verse_reference text not null default '' check (char_length(verse_reference) <= 60),
  verse_translation text not null default 'KJV' check (verse_translation in ('KJV', 'NIV', 'NLT', 'ESV')),
  verse_text text not null default '' check (char_length(verse_text) <= 1200),
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists daily_bread_briefs_week on daily_bread_briefs (week_of desc);
alter table daily_bread_briefs enable row level security;

drop policy if exists "Members read briefs" on daily_bread_briefs;
create policy "Members read briefs" on daily_bread_briefs for select using (is_daily_bread_member());

create or replace function admin_save_brief(
  p_id uuid, p_week date, p_title text, p_market text, p_reflection text, p_reference text, p_translation text, p_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  select coalesce(nullif(trim(display_name), ''), '') into v_name from profiles where user_id = auth.uid();
  if p_id is null then
    insert into daily_bread_briefs (week_of, title, market, reflection, verse_reference, verse_translation, verse_text, author_name)
    values (coalesce(p_week, current_date), trim(p_title), coalesce(trim(p_market), ''), coalesce(trim(p_reflection), ''),
            coalesce(trim(p_reference), ''), coalesce(p_translation, 'KJV'), coalesce(trim(p_text), ''), coalesce(v_name, ''))
    returning id into v_id;
  else
    update daily_bread_briefs
      set week_of = coalesce(p_week, week_of), title = trim(p_title), market = coalesce(trim(p_market), ''),
          reflection = coalesce(trim(p_reflection), ''), verse_reference = coalesce(trim(p_reference), ''),
          verse_translation = coalesce(p_translation, 'KJV'), verse_text = coalesce(trim(p_text), ''), updated_at = now()
      where id = p_id
      returning id into v_id;
    if v_id is null then
      raise exception 'brief not found';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function admin_delete_brief(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  delete from daily_bread_briefs where id = p_id;
end;
$$;

-- ------------------------------------------------------------------ --
-- 2. The member directory (only people who choose to appear)
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists directory_opt_in boolean not null default false,
  add column if not exists directory_line text not null default '' check (char_length(directory_line) <= 140);

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
    set directory_opt_in = coalesce(p_show, false), directory_line = left(coalesce(trim(p_line), ''), 140)
    where user_id = auth.uid();
end;
$$;

-- The signed-in member's own entry, so the form can show what is saved.
create or replace function my_directory_entry()
returns table (show boolean, line text)
language sql
security definer
stable
set search_path = public
as $$
  select directory_opt_in, directory_line from profiles where user_id = auth.uid();
$$;

-- Everyone who chose to appear and is still a member. Names and avatars only; never an email address.
create or replace function daily_bread_directory()
returns table (user_id uuid, display_name text, avatar text, line text, wealth boolean, ib boolean, consulting boolean)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not is_daily_bread_member() then
    raise exception 'not allowed';
  end if;
  return query
    select p.user_id,
           coalesce(nullif(trim(p.display_name), ''), 'A member'),
           p.avatar,
           p.directory_line,
           (p.wealth_status = 'approved' or p.role = 'admin'),
           (p.ib_status = 'approved' or p.role = 'admin'),
           (p.consulting_status = 'approved' or p.role = 'admin')
    from profiles p
    where p.directory_opt_in
      and (p.role = 'admin' or p.wealth_status = 'approved' or p.ib_status = 'approved' or p.consulting_status = 'approved')
    order by lower(coalesce(nullif(trim(p.display_name), ''), 'a member'));
end;
$$;

-- ------------------------------------------------------------------ --
-- 3. Models shared for peer review (Investment Banking and Consulting Tools)
-- ------------------------------------------------------------------ --
create table if not exists model_shares (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('ib', 'consulting')),
  kind text not null check (char_length(kind) between 1 and 40),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(title) between 1 and 120),
  note text not null default '' check (char_length(note) <= 600),
  data jsonb not null check (pg_column_size(data) < 200000),
  created_at timestamptz not null default now()
);
create index if not exists model_shares_track on model_shares (track, created_at desc);
alter table model_shares enable row level security;

drop policy if exists "Read shared models" on model_shares;
create policy "Read shared models" on model_shares for select using (has_track_access(track));

create table if not exists model_reviews (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references model_shares(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null default '',
  scores jsonb not null,
  strengths text not null default '' check (char_length(strengths) <= 1500),
  improve text not null default '' check (char_length(improve) <= 1500),
  created_at timestamptz not null default now(),
  unique (share_id, reviewer_id)
);
alter table model_reviews enable row level security;

drop policy if exists "Read own reviews and reviews of own models" on model_reviews;
create policy "Read own reviews and reviews of own models" on model_reviews for select
  using (
    reviewer_id = auth.uid()
    or is_admin()
    or exists (select 1 from model_shares s where s.id = share_id and s.author_id = auth.uid())
  );

create or replace function share_model(p_track text, p_kind text, p_title text, p_note text, p_data jsonb, p_show_name boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null or p_track not in ('ib', 'consulting') or not has_track_access(p_track) then
    raise exception 'not allowed';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'nothing to share';
  end if;
  if (select count(*) from model_shares where author_id = auth.uid()) >= 30 then
    raise exception 'too many shared models; remove one first';
  end if;
  if p_show_name then
    select coalesce(nullif(trim(display_name), ''), '') into v_name from profiles where user_id = auth.uid();
  end if;
  insert into model_shares (track, kind, author_id, author_name, title, note, data)
  values (p_track, left(trim(p_kind), 40), auth.uid(), coalesce(v_name, ''), trim(p_title), coalesce(trim(p_note), ''), p_data)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function delete_model_share(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  delete from model_shares where id = p_id and (author_id = auth.uid() or is_admin());
end;
$$;

-- One review per person per model; reviewing again replaces it. Four rubric scores from 1 to 4.
create or replace function review_model(p_share uuid, p_scores jsonb, p_strengths text, p_improve text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_name text;
  v_author uuid;
  v_track text;
begin
  select author_id, track into v_author, v_track from model_shares where id = p_share;
  if v_author is null then
    raise exception 'model not found';
  end if;
  if auth.uid() is null or not has_track_access(v_track) then
    raise exception 'not allowed';
  end if;
  if v_author = auth.uid() then
    raise exception 'you cannot review your own model';
  end if;
  foreach v_key in array array['structure', 'assumptions', 'accuracy', 'communication'] loop
    if coalesce((p_scores ->> v_key)::int, 0) not between 1 and 4 then
      raise exception 'score every rubric line from 1 to 4';
    end if;
  end loop;
  select coalesce(nullif(trim(display_name), ''), 'A member') into v_name from profiles where user_id = auth.uid();
  insert into model_reviews (share_id, reviewer_id, reviewer_name, scores, strengths, improve)
  values (
    p_share, auth.uid(), coalesce(v_name, 'A member'),
    jsonb_build_object(
      'structure', (p_scores ->> 'structure')::int, 'assumptions', (p_scores ->> 'assumptions')::int,
      'accuracy', (p_scores ->> 'accuracy')::int, 'communication', (p_scores ->> 'communication')::int
    ),
    coalesce(trim(p_strengths), ''), coalesce(trim(p_improve), '')
  )
  on conflict (share_id, reviewer_id) do update
    set scores = excluded.scores, strengths = excluded.strengths, improve = excluded.improve, created_at = now();
end;
$$;

create or replace function delete_model_review(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  delete from model_reviews where id = p_id and (reviewer_id = auth.uid() or is_admin());
end;
$$;

-- How many reviews each shared model has, without the reviews themselves.
create or replace function model_review_counts(p_track text)
returns table (share_id uuid, reviews bigint)
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
    select r.share_id, count(*) from model_reviews r join model_shares s on s.id = r.share_id where s.track = p_track group by r.share_id;
end;
$$;

grant execute on function admin_save_brief(uuid, date, text, text, text, text, text, text) to authenticated;
grant execute on function admin_delete_brief(uuid) to authenticated;
grant execute on function set_directory_entry(boolean, text) to authenticated;
grant execute on function my_directory_entry() to authenticated;
grant execute on function daily_bread_directory() to authenticated;
grant execute on function share_model(text, text, text, text, jsonb, boolean) to authenticated;
grant execute on function delete_model_share(uuid) to authenticated;
grant execute on function review_model(uuid, jsonb, text, text) to authenticated;
grant execute on function delete_model_review(uuid) to authenticated;
grant execute on function model_review_counts(text) to authenticated;
