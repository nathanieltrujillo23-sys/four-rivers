-- 4 Rivers — migration 015: any verse of the day
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Leaders can now pick any verse in the Bible, not just the ones in the
-- course. Course verses are still looked up by reference; any other verse is
-- stored with its own text.

alter table groups
  add column if not exists votd_text text check (votd_text is null or char_length(votd_text) <= 2000);
