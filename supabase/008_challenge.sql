-- 4 Rivers — migration 008: 30-Day Challenge
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups).
--
-- Only the start date is stored — everything else (which day you're on,
-- which tasks are done, your streak) is DERIVED at read time from data that
-- already exists (module_views, the tracker tables, quiz/exam results), same
-- ledger-integrity rule as the rest of this app. Nothing here duplicates
-- state that's tracked elsewhere.

alter table profiles
  add column if not exists challenge_started_at timestamptz;
