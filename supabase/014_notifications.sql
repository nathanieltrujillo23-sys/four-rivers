-- 4 Rivers — migration 014: group notifications
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Tells group members when someone joins the group or passes the final exam.
--   * group_events is written only by triggers (no one can insert directly)
--     and read only through my_notifications(), which returns events from
--     groups you belong to, newest first, never your own, and never from
--     before you joined.
--   * Passing the exam is shared with the people in your groups, nothing else.
--   * group_members.events_seen_at remembers when you last opened the bell.

create table if not exists group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('joined', 'exam_passed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_group_events_group on group_events (group_id, created_at desc);

alter table group_events enable row level security;

alter table group_members
  add column if not exists events_seen_at timestamptz not null default now();

create or replace function note_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into group_events (group_id, user_id, kind) values (new.group_id, new.user_id, 'joined');
  return new;
end;
$$;

drop trigger if exists trg_note_member_joined on group_members;
create trigger trg_note_member_joined
  after insert on group_members
  for each row execute function note_member_joined();

create or replace function note_exam_passed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.exam_passed_at is not null and old.exam_passed_at is null then
    insert into group_events (group_id, user_id, kind)
    select m.group_id, new.user_id, 'exam_passed'
    from group_members m
    where m.user_id = new.user_id
      and not exists (
        select 1 from group_events e
        where e.group_id = m.group_id and e.user_id = new.user_id and e.kind = 'exam_passed'
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_exam_passed on profiles;
create trigger trg_note_exam_passed
  after update of exam_passed_at on profiles
  for each row execute function note_exam_passed();

create or replace function my_notifications()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(json_agg(n order by n.created_at desc), '[]'::json)
  from (
    select e.id,
           e.group_id,
           g.name as group_name,
           e.kind,
           coalesce(nullif(trim(p.display_name), ''), nullif(am.display_name, ''), 'Someone') as actor_name,
           p.avatar as actor_avatar,
           e.created_at,
           (e.created_at > me.events_seen_at) as unread
    from group_members me
    join group_events e on e.group_id = me.group_id
    join groups g on g.id = e.group_id
    left join profiles p on p.user_id = e.user_id
    left join group_members am on am.group_id = e.group_id and am.user_id = e.user_id
    where me.user_id = auth.uid()
      and e.user_id <> auth.uid()
      and e.created_at > me.joined_at
    order by e.created_at desc
    limit 30
  ) n;
$$;

create or replace function mark_notifications_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update group_members set events_seen_at = now() where user_id = auth.uid();
$$;

grant execute on function my_notifications() to authenticated;
grant execute on function mark_notifications_seen() to authenticated;
