-- 4 Rivers — migration 009: full name for the certificate
-- Run in the Supabase SQL editor on an existing project (schema.sql already
-- includes this for fresh setups).
--
-- `display_name` stays the learner's preferred name (shown in greetings).
-- `full_name` is the name printed on the certificate; when it's empty the
-- certificate falls back to the preferred name.

alter table profiles
  add column if not exists full_name text;
