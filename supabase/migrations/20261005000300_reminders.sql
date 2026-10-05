-- 4 Rivers — migration 022: daily reading reminders
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Learners can ask for a reminder (by email, or as a notification on a device)
-- on days their group has a reading they have not marked. The reminders are
-- sent by the scheduled function /api/reminders (see api/reminders.ts), which
-- calls reminders_due() with the service role key. Nobody else can call it.

alter table profiles
  add column if not exists email_reminders boolean not null default false,
  add column if not exists reminder_lang text not null default 'en' check (reminder_lang in ('en', 'es'));

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Read your own push subscriptions" on push_subscriptions;
create policy "Read your own push subscriptions" on push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "Add your own push subscription" on push_subscriptions;
create policy "Add your own push subscription" on push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "Remove your own push subscription" on push_subscriptions;
create policy "Remove your own push subscription" on push_subscriptions
  for delete using (user_id = auth.uid());

-- Everyone who should be reminded on p_date: they are in a group (not archived) whose plan has a
-- reading covering that date, they have not ticked it, and they asked for email or have a device.
create or replace function reminders_due(p_date date)
returns table (
  user_id uuid,
  email text,
  display_name text,
  group_id uuid,
  group_name text,
  passages text,
  wants_email boolean,
  lang text
)
language sql
security definer
stable
set search_path = public
as $$
  select m.user_id,
         u.email::text,
         coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), '') as display_name,
         g.id,
         g.name,
         r.passages,
         p.email_reminders,
         p.reminder_lang
  from group_readings r
  join groups g on g.id = r.group_id and g.archived_at is null
  join group_members m on m.group_id = g.id
  join profiles p on p.user_id = m.user_id
  join auth.users u on u.id = m.user_id
  where (r.read_on = p_date or (r.through_on is not null and r.read_on <= p_date and p_date <= r.through_on))
    and not exists (
      select 1 from group_reading_checks c
      where c.group_id = g.id and c.user_id = m.user_id and c.read_on = r.read_on
    )
    and (
      p.email_reminders
      or exists (select 1 from push_subscriptions s where s.user_id = m.user_id)
    );
$$;

revoke all on function reminders_due(date) from public, anon, authenticated;
grant execute on function reminders_due(date) to service_role;
