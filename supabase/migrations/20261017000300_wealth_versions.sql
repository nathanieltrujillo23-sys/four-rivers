-- 4 Rivers: saved versions of a client plan (for comparing after each meeting).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A version is a snapshot of one of the caller's own client plans and its toolkit numbers. Only the person who made it can read it,
-- and it goes when the client plan is deleted. There are no insert, update or delete policies: the two functions below are the only way to write.

create table if not exists wealth_versions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references wealth_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '' check (char_length(label) <= 80),
  plan jsonb not null check (pg_column_size(plan) < 500000),
  tools jsonb not null default '{}'::jsonb check (pg_column_size(tools) < 1000000),
  created_at timestamptz not null default now()
);
create index if not exists wealth_versions_client_idx on wealth_versions (client_id, created_at desc);
alter table wealth_versions enable row level security;

drop policy if exists "Read own versions" on wealth_versions;
create policy "Read own versions" on wealth_versions for select
  using (user_id = auth.uid() and has_wealth_access());

create or replace function save_wealth_version(p_client uuid, p_label text, p_plan jsonb, p_tools jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from wealth_clients where id = p_client and user_id = auth.uid()) then
    raise exception 'no such client plan';
  end if;
  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'a version needs a plan';
  end if;
  if (select count(*) from wealth_versions where client_id = p_client) >= 30 then
    raise exception 'too many saved versions; delete one first';
  end if;
  insert into wealth_versions (client_id, user_id, label, plan, tools)
  values (p_client, auth.uid(), coalesce(trim(p_label), ''), p_plan, coalesce(p_tools, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function delete_wealth_version(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  delete from wealth_versions where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function save_wealth_version(uuid, text, jsonb, jsonb) to authenticated;
grant execute on function delete_wealth_version(uuid) to authenticated;
