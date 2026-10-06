-- 4 Rivers: tests for answered-prayer alerts, announcements, and the public numbers strip.
-- Cast: A admin, L leader, C co-leader, P posted the prayer, M another member, O not in the group.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'leader@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', 'co@test.local',     'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'poster@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'member@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'other@test.local',  'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';
update profiles set leader_status = 'approved' where user_id in
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');

insert into groups (id, name, join_code, leader_id) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Test group', '9003', '00000000-0000-0000-0000-0000000000b1');
insert into group_members (group_id, user_id, display_name, is_co_leader, joined_at) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000b1', 'Leader', false, now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000c1', 'Co', true, now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'Poster', false, now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d2', 'Member', false, now() - interval '1 day');
insert into group_prayers (id, group_id, user_id, author_name, anonymous, body) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'Poster', false, 'Pray for my interview'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', '', true, 'A private need');

-- Joining the group wrote its own "joined" alerts; clear them so only the prayer alerts are counted below.
delete from group_events;

-- ----------------------------------------------------------------- the leader marks the first prayer answered
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select set_prayer_answered('00000000-0000-0000-0000-0000000000f1', true);

-- the poster is told, and is told it is theirs
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(my_notifications()::jsonb), 1, 'the person who posted the request is told it was answered');
select is((my_notifications()::jsonb -> 0 ->> 'kind'), 'prayer_answered', 'it is an answered-prayer alert');
select is((my_notifications()::jsonb -> 0 ->> 'mine'), 'true', 'the alert says the request was theirs');
select is((my_notifications()::jsonb -> 0 ->> 'note'), 'Pray for my interview', 'it carries the start of the request');

-- the co-leader is told too (the leader did it, so the leader is not told)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(my_notifications()::jsonb), 1, 'a co-leader is told');
select is((my_notifications()::jsonb -> 0 ->> 'mine'), 'false', 'a co-leader''s alert is not marked as their own request');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(my_notifications()::jsonb), 0, 'whoever marks it answered is not told about it');

-- an ordinary member hears nothing
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is(my_notifications()::text, '[]', 'other members are not told');

-- ----------------------------------------------------------------- an anonymous request stays unnamed
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select set_prayer_answered('00000000-0000-0000-0000-0000000000f2', true);
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is((select (n ->> 'actor_name') from jsonb_array_elements(my_notifications()::jsonb) n where n ->> 'note' = 'A private need'),
  'Someone', 'a request posted without a name is not named when its author marks it answered');

-- an ordinary member cannot mark someone else's request answered
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select set_prayer_answered('00000000-0000-0000-0000-0000000000f1', false)$$, null, null,
  'a member cannot change someone else''s prayer request');

-- the poster marking their own request tells the leaders and not themselves
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select set_prayer_answered('00000000-0000-0000-0000-0000000000f1', false);
select set_prayer_answered('00000000-0000-0000-0000-0000000000f1', true);
select is(jsonb_array_length(my_notifications()::jsonb), 1, 'the poster marking their own request is only told about the earlier one');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select ok(jsonb_array_length(my_notifications()::jsonb) >= 2, 'the leader is told when the poster marks it answered');

-- ----------------------------------------------------------------- announcements stay private
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from admin_announcements()$$, null, null, 'a learner cannot read announcements');
select throws_ok($$select * from announcement_recipients('everyone')$$, null, null, 'a learner cannot list who an announcement goes to');

reset role;
set local role service_role;
select is((select count(*) from announcement_recipients('leaders')), 2::bigint, 'leaders means the leader and co-leaders');
select is((select count(*) from announcement_recipients('everyone')), 6::bigint, 'everyone means every account with an email');

-- ----------------------------------------------------------------- the numbers strip
reset role;
set local role anon;
select is((public_stats()::jsonb ->> 'enabled'), 'false', 'the numbers strip is off until an admin turns it on');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
insert into site_text (id, content) values ('settings:stats', '{"enabled": true}'::jsonb);
reset role;
set local role anon;
select is((public_stats()::jsonb ->> 'learners')::int, 6, 'once on, a signed-out visitor can read the counts');

reset role;
select * from finish();
rollback;
