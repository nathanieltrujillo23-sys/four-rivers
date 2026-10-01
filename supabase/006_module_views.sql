-- 4 Rivers — migration 006: server-side module-read tracking
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups).
--
-- "Modules read" progress (which lesson screens a learner has opened) used to
-- live only in localStorage, which reset on every new browser/device. That's
-- fine as a lightweight progress bar, but it became load-bearing once the
-- final exam gate started requiring every module explicitly marked read
-- (see canTakeFinalExam in state/progress.ts) — losing it on a new device
-- shouldn't force someone to re-click through modules they already read.
--
-- One row per (user, section, module_index) viewed, same ledger-integrity
-- pattern as every other tracker in this app: counts are derived by querying
-- distinct rows, never stored as a running total.

create table if not exists module_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('introduction', '1', '2', '3', '4')),
  module_index int not null check (module_index >= 0),
  viewed_at timestamptz not null default now(),
  primary key (user_id, section, module_index)
);

create index if not exists idx_module_views_user on module_views (user_id);

alter table module_views enable row level security;

drop policy if exists "Users manage their own module views" on module_views;
create policy "Users manage their own module views"
  on module_views for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
