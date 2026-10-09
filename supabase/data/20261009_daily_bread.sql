-- 4 Rivers: one-time setup for the Daily Bread group (University of Florida). Run once in the Supabase SQL editor,
-- after supabase/migrations/20261009000100_discovery_workshop.sql.
--
--   * join code 2810, to mirror Ephesians 2:8-10, and permanent
--   * Ephesians 2:8-10 (KJV) as the group's permanent verse, instead of a verse of the day
--   * the six-step Discovery workshop turned on for the group's leaders
--
-- This is data for one group, not part of the schema, so it lives here and not in migrations.

update groups
set join_code = '2810',
    votd_day = null,
    votd_reference = 'Ephesians 2:8-10',
    votd_translation = 'KJV',
    votd_text = 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast. For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.',
    votd_note = null,
    votd_updated_at = now(),
    verse_locked = true,
    code_locked = true,
    workshop_enabled = true
where name = 'Daily Bread'
  and not exists (select 1 from groups other where other.join_code = '2810' and other.name <> 'Daily Bread');
