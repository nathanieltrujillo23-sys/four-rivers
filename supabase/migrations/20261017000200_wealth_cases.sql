-- 4 Rivers: Wealth Tools case library and peer review (Daily Bread wealth track only).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A student can publish an anonymized copy of a client plan as a case. Everyone with Wealth Tools can read the library; only
-- the author (or an admin) can remove a case. Peers can review a case against a rubric; a review is private to the person who
-- wrote it, the case's author, and admins. There are no insert, update or delete policies: the functions below are the only way
-- to write.

create table if not exists wealth_cases (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 600),
  plan jsonb not null check (pg_column_size(plan) < 400000),
  tools jsonb not null default '{}'::jsonb check (pg_column_size(tools) < 400000),
  created_at timestamptz not null default now()
);
create index if not exists wealth_cases_created on wealth_cases (created_at desc);
alter table wealth_cases enable row level security;

drop policy if exists "Read cases" on wealth_cases;
create policy "Read cases" on wealth_cases for select using (has_wealth_access());

create table if not exists wealth_case_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references wealth_cases(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null default '',
  scores jsonb not null,
  strengths text not null default '' check (char_length(strengths) <= 1500),
  improve text not null default '' check (char_length(improve) <= 1500),
  created_at timestamptz not null default now(),
  unique (case_id, reviewer_id)
);
alter table wealth_case_reviews enable row level security;

drop policy if exists "Read own reviews and reviews of own cases" on wealth_case_reviews;
create policy "Read own reviews and reviews of own cases" on wealth_case_reviews for select
  using (
    has_wealth_access()
    and (
      reviewer_id = auth.uid()
      or is_admin()
      or exists (select 1 from wealth_cases c where c.id = case_id and c.author_id = auth.uid())
    )
  );

-- Publishes an anonymized case. p_show_name false posts it as "A student in the track".
create or replace function publish_wealth_case(p_title text, p_summary text, p_plan jsonb, p_tools jsonb, p_show_name boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'a case needs a plan';
  end if;
  if (select count(*) from wealth_cases where author_id = auth.uid()) >= 50 then
    raise exception 'too many cases; remove one first';
  end if;
  if p_show_name then
    select coalesce(nullif(trim(display_name), ''), '') into v_name from profiles where user_id = auth.uid();
  end if;
  insert into wealth_cases (author_id, author_name, title, summary, plan, tools)
  values (auth.uid(), coalesce(v_name, ''), trim(p_title), coalesce(trim(p_summary), ''), p_plan, coalesce(p_tools, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function delete_wealth_case(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  delete from wealth_cases where id = p_id and (author_id = auth.uid() or is_admin());
end;
$$;

-- One review per person per case; reviewing again replaces it. Six rubric scores from 1 to 4.
create or replace function review_wealth_case(p_case uuid, p_scores jsonb, p_strengths text, p_improve text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_name text;
  v_author uuid;
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  select author_id into v_author from wealth_cases where id = p_case;
  if v_author is null then
    raise exception 'case not found';
  end if;
  if v_author = auth.uid() then
    raise exception 'you cannot review your own case';
  end if;
  foreach v_key in array array['discovery', 'goals', 'rigor', 'assumptions', 'communication', 'compliance'] loop
    if coalesce((p_scores ->> v_key)::int, 0) not between 1 and 4 then
      raise exception 'score every rubric line from 1 to 4';
    end if;
  end loop;
  select coalesce(nullif(trim(display_name), ''), 'A student') into v_name from profiles where user_id = auth.uid();
  insert into wealth_case_reviews (case_id, reviewer_id, reviewer_name, scores, strengths, improve)
  values (
    p_case, auth.uid(), coalesce(v_name, 'A student'),
    jsonb_build_object(
      'discovery', (p_scores ->> 'discovery')::int, 'goals', (p_scores ->> 'goals')::int, 'rigor', (p_scores ->> 'rigor')::int,
      'assumptions', (p_scores ->> 'assumptions')::int, 'communication', (p_scores ->> 'communication')::int,
      'compliance', (p_scores ->> 'compliance')::int
    ),
    coalesce(trim(p_strengths), ''), coalesce(trim(p_improve), '')
  )
  on conflict (case_id, reviewer_id) do update
    set scores = excluded.scores, strengths = excluded.strengths, improve = excluded.improve, created_at = now();
end;
$$;

create or replace function delete_wealth_review(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  delete from wealth_case_reviews where id = p_id and (reviewer_id = auth.uid() or is_admin());
end;
$$;

-- How many reviews each case has, without the reviews themselves (so the library can show "2 reviews" to everyone).
create or replace function wealth_case_review_counts()
returns table (case_id uuid, reviews bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  return query select r.case_id, count(*) from wealth_case_reviews r group by r.case_id;
end;
$$;

grant execute on function publish_wealth_case(text, text, jsonb, jsonb, boolean) to authenticated;
grant execute on function delete_wealth_case(uuid) to authenticated;
grant execute on function review_wealth_case(uuid, jsonb, text, text) to authenticated;
grant execute on function delete_wealth_review(uuid) to authenticated;
grant execute on function wealth_case_review_counts() to authenticated;
