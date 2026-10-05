-- 4 Rivers — migration 003: river quizzes
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups). Safe to run once; re-running is harmless
-- thanks to "if not exists".
--
-- Adds two nullable columns to the existing course_progress table. Nothing
-- destructive, no existing data is touched. Until this runs, quiz results
-- simply fail to save (the rest of the app keeps working normally, same
-- degrade-gracefully approach as the journal migration).

alter table course_progress
  add column if not exists quiz_passed_at timestamptz,
  add column if not exists quiz_best_score int check (quiz_best_score between 0 and 10);
