-- 4 Rivers: the Discovery workshop (Daily Bread) and permanent group settings.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Three switches on a group, set only from the SQL editor by the site owner (never by a leader):
--   workshop_enabled  turns on the six-step Discovery workshop for the group's leaders
--   verse_locked      the group's verse is permanent (the leader cannot change or clear it)
--   code_locked       the group's join code is permanent (it cannot be regenerated)
-- And a table of discovery meetings: the notes an analyst takes while meeting one person. Those notes are
-- confidential (see the workshop agreement), so only the analyst who made them, and the group's owner, can read them.

alter table groups
  add column if not exists verse_locked boolean not null default false,
  add column if not exists code_locked boolean not null default false,
  add column if not exists workshop_enabled boolean not null default false;

create or replace function protect_locked_group()
returns trigger
language plpgsql
as $$
begin
  -- No signed-in user means the SQL editor (the site owner). Everyone else is held to the locks.
  if auth.uid() is not null then
    if new.workshop_enabled is distinct from old.workshop_enabled
       or new.verse_locked is distinct from old.verse_locked
       or new.code_locked is distinct from old.code_locked then
      raise exception 'only the site owner can change this';
    end if;
    if old.verse_locked and (
         new.votd_day is distinct from old.votd_day
         or new.votd_reference is distinct from old.votd_reference
         or new.votd_translation is distinct from old.votd_translation
         or new.votd_text is distinct from old.votd_text
         or new.votd_note is distinct from old.votd_note) then
      raise exception 'this group''s verse is permanent';
    end if;
    if old.code_locked and new.join_code is distinct from old.join_code then
      raise exception 'this group''s code is permanent';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_locked_group on groups;
create trigger protect_locked_group
  before update on groups
  for each row execute function protect_locked_group();

create table if not exists discovery_meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  participant_name text not null check (char_length(trim(participant_name)) between 1 and 80),
  step int not null default 0 check (step between 0 and 5),
  answers jsonb not null default '{}'::jsonb check (pg_column_size(answers) < 200000),
  topics text[] not null default '{}' check (cardinality(topics) <= 12),
  agreement jsonb check (agreement is null or pg_column_size(agreement) < 200000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discovery_meetings_group_idx on discovery_meetings (group_id, created_at desc);
alter table discovery_meetings enable row level security;

-- May this person read and change the meetings of a group? The workshop must be on for the group, and they must be
-- the group's owner (all meetings) or a co-leader (only the ones they made themselves).
create or replace function can_use_workshop(gid uuid, creator uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from groups g
    where g.id = gid
      and g.workshop_enabled
      and (g.leader_id = auth.uid() or (creator = auth.uid() and is_group_manager(gid)))
  );
$$;

drop policy if exists "Analysts read their meetings" on discovery_meetings;
create policy "Analysts read their meetings" on discovery_meetings
  for select to authenticated using (can_use_workshop(group_id, created_by));

drop policy if exists "Analysts start meetings" on discovery_meetings;
create policy "Analysts start meetings" on discovery_meetings
  for insert to authenticated
  with check (created_by = auth.uid() and can_use_workshop(group_id, created_by));

drop policy if exists "Analysts change their meetings" on discovery_meetings;
create policy "Analysts change their meetings" on discovery_meetings
  for update to authenticated
  using (can_use_workshop(group_id, created_by))
  with check (can_use_workshop(group_id, created_by));

drop policy if exists "Analysts delete their meetings" on discovery_meetings;
create policy "Analysts delete their meetings" on discovery_meetings
  for delete to authenticated using (can_use_workshop(group_id, created_by));
