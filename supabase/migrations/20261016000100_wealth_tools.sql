-- 4 Rivers: Wealth Tools (a tool-style space in Community).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Anyone can ask for wealth tools from the Community page; an admin approves (like leader status). Once approved, a person
-- has a private workspace: their six-module wealth plan and the saved numbers for each money-toolkit tool. Everything is
-- kept in one row per person, readable only by that person, so nobody's plan or numbers are ever mixed with anyone else's.
-- Not even group leaders or admins can read another person's workspace.

-- ------------------------------------------------------------------ --
-- Profiles: wealth status (none -> requested -> approved)
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists wealth_status text not null default 'none'
    check (wealth_status in ('none', 'requested', 'approved')),
  add column if not exists wealth_requested_at timestamptz,
  add column if not exists wealth_note text,
  add column if not exists wealth_request_notified_at timestamptz;

-- Wealth status, like leader status, only changes through the functions below (or from the SQL editor).
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
  end if;
  return new;
end;
$$;

create or replace function request_wealth(p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  perform set_config('app.wealth_rpc', 'on', true);
  update profiles
    set wealth_status = 'requested',
        wealth_requested_at = now(),
        wealth_note = left(trim(coalesce(p_note, '')), 300)
    where user_id = auth.uid() and wealth_status = 'none';
end;
$$;

create or replace function admin_set_wealth(p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;
  perform set_config('app.wealth_rpc', 'on', true);
  update profiles
    set wealth_status = case when p_approve then 'approved' else 'none' end
    where user_id = p_user;
end;
$$;

create or replace function admin_wealth_requests()
returns table (
  user_id uuid,
  display_name text,
  email text,
  note text,
  status text,
  requested_at timestamptz
)
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
    select p.user_id,
           coalesce(nullif(trim(p.display_name), ''), ''),
           u.email::text,
           p.wealth_note,
           p.wealth_status,
           p.wealth_requested_at
    from profiles p
    join auth.users u on u.id = p.user_id
    where p.wealth_status in ('requested', 'approved')
    order by (p.wealth_status = 'requested') desc, p.wealth_requested_at desc nulls last;
end;
$$;

-- Approved people and admins may use the tools.
create or replace function has_wealth_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and (wealth_status = 'approved' or role = 'admin')
  );
$$;

-- ------------------------------------------------------------------ --
-- The private workspace: one row per person
-- ------------------------------------------------------------------ --
create table if not exists wealth_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- The six-module wealth plan (goals, SWOT, mission, model inputs, schedule, roadmap).
  plan jsonb check (plan is null or pg_column_size(plan) < 500000),
  -- The saved numbers for each money-toolkit tool, keyed by tool id.
  tools jsonb not null default '{}'::jsonb check (pg_column_size(tools) < 1000000),
  updated_at timestamptz not null default now()
);
alter table wealth_workspaces enable row level security;

drop policy if exists "Read own wealth workspace" on wealth_workspaces;
create policy "Read own wealth workspace" on wealth_workspaces for select
  using (user_id = auth.uid() and has_wealth_access());
-- No insert, update, or delete policies: the two functions below are the only way to write, and they only write
-- the caller's own row.

create or replace function save_wealth_plan(p_plan jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not has_wealth_access() then
    raise exception 'not allowed';
  end if;
  insert into wealth_workspaces (user_id, plan, updated_at)
  values (auth.uid(), p_plan, now())
  on conflict (user_id) do update set plan = excluded.plan, updated_at = now();
end;
$$;

-- Saves one tool's numbers without touching the others (a null state clears that tool).
create or replace function save_wealth_tool(p_tool text, p_state jsonb)
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
  insert into wealth_workspaces (user_id, tools, updated_at)
  values (
    auth.uid(),
    case when p_state is null or p_state = 'null'::jsonb then '{}'::jsonb else jsonb_build_object(p_tool, p_state) end,
    now()
  )
  on conflict (user_id) do update
    set tools = case
          when p_state is null or p_state = 'null'::jsonb then wealth_workspaces.tools - p_tool
          else jsonb_set(wealth_workspaces.tools, array[p_tool], p_state, true)
        end,
        updated_at = now();
end;
$$;

grant execute on function request_wealth(text) to authenticated;
grant execute on function admin_set_wealth(uuid, boolean) to authenticated;
grant execute on function admin_wealth_requests() to authenticated;
grant execute on function has_wealth_access() to authenticated;
grant execute on function save_wealth_plan(jsonb) to authenticated;
grant execute on function save_wealth_tool(text, jsonb) to authenticated;
