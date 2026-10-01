-- 4 Rivers — migration 005: certificate verification
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups). Safe to run once; re-running is harmless
-- thanks to "if not exists".
--
-- A certificate link needs to be checkable by someone who isn't signed in
-- (an employer, a pastor, whoever the learner shares it with) without
-- exposing the rest of `profiles` (role, auth-linked fields, etc). This is a
-- small, deliberately narrow public-readable table holding only what a
-- verification page needs to show, kept in sync with `profiles` whenever an
-- exam result is recorded.

create table if not exists certificate_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  completed_at timestamptz,
  exam_passed_at timestamptz not null,
  exam_best_score int not null check (exam_best_score between 0 and 50),
  updated_at timestamptz not null default now()
);

alter table certificate_verifications enable row level security;

drop policy if exists "Anyone can verify a certificate" on certificate_verifications;
create policy "Anyone can verify a certificate"
  on certificate_verifications for select
  using (true);

drop policy if exists "Users manage their own certificate verification row" on certificate_verifications;
create policy "Users manage their own certificate verification row"
  on certificate_verifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
