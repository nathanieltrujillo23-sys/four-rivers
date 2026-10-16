-- 4 Rivers: remove the Daily Bread community group (2026-10-16). One-time data change, not part of the schema.
--
-- The Discovery workshop and the money toolkit that lived in this group moved to Wealth Tools (a private, tool-style space
-- in Community; see migrations/20261016000100_wealth_tools.sql), so the group itself is no longer needed.
--
-- Deleting a group deletes everything that belongs to it (its memberships, chat, prayers, readings, and discovery meetings).
-- People's accounts, course progress and trackers are not touched. The group's completed discovery meeting notes are
-- confidential, so before the delete they are copied to `archived_discovery_meetings`, a table with no access policy
-- (only the SQL editor can read it). Drop that table when the notes are no longer needed:
--     drop table archived_discovery_meetings;
--
-- Matches the one group by its id, so the separate "Bread Group - Muffins" group is left alone.

create table if not exists archived_discovery_meetings (like discovery_meetings including all, archived_at timestamptz not null default now());
alter table archived_discovery_meetings enable row level security;

insert into archived_discovery_meetings
select m.*, now()
from discovery_meetings m
where m.group_id = '7983405e-04af-44da-825d-f8693d726b14'
  and not exists (select 1 from archived_discovery_meetings a where a.id = m.id);

delete from groups where id = '7983405e-04af-44da-825d-f8693d726b14' and name = 'Daily Bread';
