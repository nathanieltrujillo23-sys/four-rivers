-- 4 Rivers — migration 004: final exam
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups). Safe to run once; re-running is harmless
-- thanks to "if not exists".
--
-- The 50-question final exam isn't tied to any one river, so its result
-- lives on the profile (one row per user) rather than on course_progress.
-- Passing (>= 70%, i.e. 35/50) is required to view the certificate.

alter table profiles
  add column if not exists exam_passed_at timestamptz,
  add column if not exists exam_best_score int check (exam_best_score between 0 and 50);
