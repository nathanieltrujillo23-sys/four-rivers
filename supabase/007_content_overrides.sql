-- 4 Rivers — migration 007: in-app content editing
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups).
--
-- Lesson content ships as static TypeScript (src/content/lessons/*.ts). This
-- table lets an admin override any module's text from the Admin page without
-- a code deploy: one row per module, id = "<section>:<moduleIndex>" (e.g.
-- "introduction:0", "1:3"). A row's content is the full module JSON (title,
-- body, scriptureRefs) — when no row exists, the static default is used.
-- Deleting the row reverts that module to its default text.

create table if not exists content_overrides (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table content_overrides enable row level security;

-- Every signed-in learner needs to read the live (possibly overridden) text.
drop policy if exists "Signed-in users can read content overrides" on content_overrides;
create policy "Signed-in users can read content overrides"
  on content_overrides for select
  using (auth.role() = 'authenticated');

-- Only admins can change it.
drop policy if exists "Admins manage content overrides" on content_overrides;
create policy "Admins manage content overrides"
  on content_overrides for all
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));

-- One-time: make an existing account an admin (run after that account has
-- signed up at least once, so its profiles row exists). Replace the email.
-- update profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'nathanieltrujillo23@gmail.com');
