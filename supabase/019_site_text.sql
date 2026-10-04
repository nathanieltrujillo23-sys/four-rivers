-- 4 Rivers — migration 019: editable site text (the home page testimony)
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Lets an admin edit the "My Testimony" section of the home page. One row per
-- text block and language ("testimony:en", "testimony:es"). Everyone, signed
-- in or not, can read it, because the home page is public. Only admins can
-- change it. With no row, the app shows the text shipped in the code.

create table if not exists site_text (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table site_text enable row level security;

drop policy if exists "Anyone can read site text" on site_text;
create policy "Anyone can read site text"
  on site_text for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage site text" on site_text;
create policy "Admins manage site text"
  on site_text for all
  to authenticated
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));
