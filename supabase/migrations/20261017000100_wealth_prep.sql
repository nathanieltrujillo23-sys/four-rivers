-- 4 Rivers: Wealth Tools career prep (interview practice, market journal, readiness checklist, application tracker).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- One private document per person who has Wealth Tools. Only that person can read it; there is no way to read or write
-- anyone else's. A small counter function lets the app note when a deck or case export is made.

create table if not exists wealth_prep (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 800000),
  updated_at timestamptz not null default now()
);
alter table wealth_prep enable row level security;

drop policy if exists "Read own prep" on wealth_prep;
create policy "Read own prep" on wealth_prep for select
  using (user_id = auth.uid() and has_wealth_access());
-- No insert, update, or delete policies: the two functions below are the only way to write.

create or replace function save_wealth_prep(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  insert into wealth_prep (user_id, data, updated_at)
  values (auth.uid(), p_data, now())
  on conflict (user_id) do update
    -- The counters are kept by bump_wealth_stat, so a save from the page never rolls them back.
    set data = jsonb_set(coalesce(p_data, '{}'::jsonb), '{stats}', coalesce(wealth_prep.data -> 'stats', '{}'::jsonb), true),
        updated_at = now();
end;
$$;

create or replace function bump_wealth_stat(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  if p_key not in ('decks', 'caseExports') then
    raise exception 'unknown counter';
  end if;
  insert into wealth_prep (user_id, data)
  values (auth.uid(), jsonb_build_object('stats', jsonb_build_object(p_key, 1)))
  on conflict (user_id) do update
    set data = jsonb_set(
          wealth_prep.data,
          '{stats}',
          coalesce(wealth_prep.data -> 'stats', '{}'::jsonb)
            || jsonb_build_object(p_key, coalesce((wealth_prep.data #>> array['stats', p_key])::int, 0) + 1),
          true
        ),
        updated_at = now();
end;
$$;

grant execute on function save_wealth_prep(jsonb) to authenticated;
grant execute on function bump_wealth_stat(text) to authenticated;
