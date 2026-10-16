-- 4 Rivers: Wealth Tools holds one plan per client (not one per person).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Wealth Tools is for students in the Daily Bread wealth management track: they take a discovery meeting with another
-- student or client through to a full scenario walk-through presentation. So each person (the analyst) keeps a list of
-- client plans, each with its own wealth plan and its own saved toolkit numbers. Every row belongs to one analyst and is
-- readable only by them; nobody else, group leaders and admins included, can read a client plan.

create table if not exists wealth_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- A label for the list; the app keeps it in step with the client's name in the plan.
  name text not null default '' check (char_length(name) <= 120),
  -- The wealth plan: profile, goals, SWOT, mission, model inputs, focus areas, schedule, roadmap, deck settings.
  plan jsonb check (plan is null or pg_column_size(plan) < 500000),
  -- The saved numbers for each money-toolkit tool, keyed by tool id.
  tools jsonb not null default '{}'::jsonb check (pg_column_size(tools) < 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wealth_clients_user_idx on wealth_clients (user_id, updated_at desc);
alter table wealth_clients enable row level security;

drop policy if exists "Read own client plans" on wealth_clients;
create policy "Read own client plans" on wealth_clients for select
  using (user_id = auth.uid() and has_wealth_access());
-- No insert, update, or delete policies: the four functions below are the only way to write, and each one only touches
-- the caller's own rows.

-- Plans already saved in the first version (one per person) become that person's first client plan.
insert into wealth_clients (user_id, name, plan, tools, created_at, updated_at)
select w.user_id,
       left(coalesce(nullif(trim(w.plan -> 'client' ->> 'name'), ''), 'My plan'), 120),
       w.plan, w.tools, w.updated_at, w.updated_at
from wealth_workspaces w
where (w.plan is not null or w.tools <> '{}'::jsonb)
  and not exists (select 1 from wealth_clients c where c.user_id = w.user_id);

create or replace function create_wealth_client(p_plan jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  if (select count(*) from wealth_clients where user_id = auth.uid()) >= 60 then
    raise exception 'too many client plans';
  end if;
  insert into wealth_clients (user_id, name, plan)
  values (
    auth.uid(),
    left(coalesce(nullif(trim(p_plan -> 'client' ->> 'name'), ''), 'New client'), 120),
    p_plan
  )
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function save_wealth_client(p_id uuid, p_plan jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  update wealth_clients
     set plan = p_plan,
         name = left(coalesce(nullif(trim(p_plan -> 'client' ->> 'name'), ''), 'New client'), 120),
         updated_at = now()
   where id = p_id and user_id = auth.uid();
  if not found then
    raise exception 'no such client plan';
  end if;
end;
$$;

-- Saves one tool's numbers for one client without touching the others (a null state clears that tool).
create or replace function save_wealth_client_tool(p_id uuid, p_tool text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  if p_tool is null or p_tool !~ '^[a-z]{2,24}$' then
    raise exception 'unknown tool';
  end if;
  update wealth_clients
     set tools = case
           when p_state is null or p_state = 'null'::jsonb then tools - p_tool
           else jsonb_set(tools, array[p_tool], p_state, true)
         end,
         updated_at = now()
   where id = p_id and user_id = auth.uid();
  if not found then
    raise exception 'no such client plan';
  end if;
end;
$$;

create or replace function delete_wealth_client(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  delete from wealth_clients where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function create_wealth_client(jsonb) to authenticated;
grant execute on function save_wealth_client(uuid, jsonb) to authenticated;
grant execute on function save_wealth_client_tool(uuid, text, jsonb) to authenticated;
grant execute on function delete_wealth_client(uuid) to authenticated;

-- The one-per-person functions are replaced by the client functions above. (The old table is left in place, untouched,
-- as a copy of what was migrated; drop it later with: drop table wealth_workspaces;)
drop function if exists save_wealth_plan(jsonb);
drop function if exists save_wealth_tool(text, jsonb);
