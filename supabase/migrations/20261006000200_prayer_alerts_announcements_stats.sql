-- 4 Rivers: answered-prayer alerts, announcements, leader-request and welcome emails, public numbers strip.
-- Run once in the Supabase SQL editor, AFTER 20261006000100. Safe to re-run.

-- ------------------------------------------------------------------ --
-- Answered-prayer alerts: only the person who posted the request and the group's leaders hear about it
-- ------------------------------------------------------------------ --
alter table group_events
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists prayer_id uuid references group_prayers(id) on delete cascade,
  add column if not exists note text,
  add column if not exists actor_hidden boolean not null default false,
  add column if not exists is_poster boolean not null default false;

alter table group_events drop constraint if exists group_events_kind_check;
alter table group_events
  add constraint group_events_kind_check check (kind in ('joined', 'exam_passed', 'prayer_answered'));

create or replace function note_prayer_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := coalesce(auth.uid(), new.user_id);
begin
  if new.answered_at is not null and old.answered_at is null then
    insert into group_events (group_id, user_id, kind, recipient_id, prayer_id, note, actor_hidden, is_poster)
    select new.group_id,
           actor,
           'prayer_answered',
           r.user_id,
           new.id,
           left(new.body, 90),
           -- Someone who posted a request without their name stays unnamed when they mark it answered.
           (new.anonymous and actor = new.user_id),
           (r.user_id = new.user_id)
    from (
      select new.user_id as user_id
      union
      select g.leader_id from groups g where g.id = new.group_id
      union
      select m.user_id from group_members m where m.group_id = new.group_id and m.is_co_leader
    ) r
    where r.user_id is not null and r.user_id <> actor;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_note_prayer_answered on group_prayers;
create trigger trg_note_prayer_answered
  after update of answered_at on group_prayers
  for each row execute function note_prayer_answered();

-- Marking a request answered: the person who posted it, or one of the group's leaders (who may hear it from them).
create or replace function set_prayer_answered(p_prayer uuid, p_answered boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  owner uuid;
begin
  select group_id, user_id into gid, owner from group_prayers where id = p_prayer;
  if gid is null then
    raise exception 'prayer not found';
  end if;
  if auth.uid() is distinct from owner and not is_group_manager(gid) then
    raise exception 'only the person who posted this, or a group leader, can change it';
  end if;
  update group_prayers
     set answered_at = case when p_answered then coalesce(answered_at, now()) else null end
   where id = p_prayer;
end;
$$;
grant execute on function set_prayer_answered(uuid, boolean) to authenticated;

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
           case when e.actor_hidden then 'Someone'
                else coalesce(nullif(trim(p.display_name), ''), nullif(am.display_name, ''), 'Someone') end as actor_name,
           case when e.actor_hidden then null else p.avatar end as actor_avatar,
           e.note,
           e.is_poster as mine,
           e.created_at,
           (e.created_at > me.events_seen_at) as unread
    from group_members me
    join group_events e on e.group_id = me.group_id
    join groups g on g.id = e.group_id
    left join profiles p on p.user_id = e.user_id
    left join group_members am on am.group_id = e.group_id and am.user_id = e.user_id
    where me.user_id = auth.uid()
      and e.user_id <> auth.uid()
      and (e.recipient_id is null or e.recipient_id = auth.uid())
      and e.created_at > me.joined_at
    order by e.created_at desc
    limit 30
  ) n;
$$;
grant execute on function my_notifications() to authenticated;

-- ------------------------------------------------------------------ --
-- Emails: welcome, leader-request alert, announcements
-- ------------------------------------------------------------------ --
alter table profiles
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists leader_request_notified_at timestamptz,
  add column if not exists announce_emails boolean not null default true;

-- Everyone who already has an account has been welcomed; only new sign-ups get the welcome email.
update profiles set welcome_sent_at = now() where welcome_sent_at is null;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('leaders', 'everyone')),
  subject text not null check (char_length(subject) between 1 and 150),
  body text not null check (char_length(body) between 1 and 5000),
  sent_by uuid references auth.users(id) on delete set null,
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table announcements enable row level security;
-- No policies: only the functions below and the server (service role) touch it.

create or replace function admin_announcements()
returns table (id uuid, audience text, subject text, body text, sent_count int, created_at timestamptz)
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
    select a.id, a.audience, a.subject, a.body, a.sent_count, a.created_at
    from announcements a order by a.created_at desc limit 50;
end;
$$;
grant execute on function admin_announcements() to authenticated;

-- Who an announcement goes to (server only). Leaders means approved leaders plus co-leaders.
create or replace function announcement_recipients(p_audience text)
returns table (user_id uuid, email text, display_name text, lang text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, u.email::text, coalesce(nullif(trim(p.display_name), ''), ''), p.reminder_lang
  from profiles p
  join auth.users u on u.id = p.user_id
  where p.announce_emails
    and u.email is not null
    and (
      p_audience = 'everyone'
      or p.leader_status = 'approved'
      or exists (select 1 from group_members m where m.user_id = p.user_id and m.is_co_leader)
    );
$$;
revoke all on function announcement_recipients(text) from public, anon, authenticated;
grant execute on function announcement_recipients(text) to service_role;

-- ------------------------------------------------------------------ --
-- The home page's "by the numbers" strip: the admin turns it on or off, anyone can read the numbers while it is on
-- ------------------------------------------------------------------ --
create or replace function public_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  on_ boolean;
begin
  select coalesce((content ->> 'enabled')::boolean, false) into on_ from site_text where id = 'settings:stats';
  if not coalesce(on_, false) then
    return json_build_object('enabled', false);
  end if;
  return json_build_object(
    'enabled', true,
    'learners', (select count(*) from profiles),
    'certificates', (select count(*) from profiles where exam_passed_at is not null),
    'groups', (select count(*) from groups where archived_at is null)
  );
end;
$$;
grant execute on function public_stats() to anon, authenticated;
