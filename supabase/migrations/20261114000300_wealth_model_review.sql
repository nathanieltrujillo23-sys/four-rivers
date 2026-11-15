-- 4 Rivers: peer review of models extends to Wealth Tools (the backtest, the withdrawal study, the estate snapshot).
-- Run once in the Supabase SQL editor, after 20261114000200_daily_bread_addins.sql. Safe to re-run.
--
-- A shared model's track can now be 'wealth' as well as 'ib' or 'consulting'. Who may read, share and review follows
-- the same approval as the tool set itself: Wealth Tools for 'wealth', the track approvals for the other two.

alter table model_shares drop constraint if exists model_shares_track_check;
alter table model_shares add constraint model_shares_track_check check (track in ('ib', 'consulting', 'wealth'));

create or replace function has_model_access(p_track text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case when p_track = 'wealth' then has_wealth_access() else has_track_access(p_track) end;
$$;

drop policy if exists "Read shared models" on model_shares;
create policy "Read shared models" on model_shares for select using (has_model_access(track));

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
  if auth.uid() is null or p_track not in ('ib', 'consulting', 'wealth') or not has_model_access(p_track) then
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
  if auth.uid() is null or not has_model_access(v_track) then
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

create or replace function model_review_counts(p_track text)
returns table (share_id uuid, reviews bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not has_model_access(p_track) then
    raise exception 'not allowed';
  end if;
  return query
    select r.share_id, count(*) from model_reviews r join model_shares s on s.id = r.share_id where s.track = p_track group by r.share_id;
end;
$$;

grant execute on function has_model_access(text) to authenticated;
