-- 4 Rivers: permission tests for the database rules.
--
-- Most of the app's security lives in SQL (row level security, triggers, and
-- functions), so these tests sign in as different people and check what each
-- can and cannot do. They run in one transaction that is rolled back, so they
-- leave nothing behind.
--
-- Run them locally (needs Docker and the Supabase CLI):
--     supabase start
--     supabase test db
-- They also run in the CI workflow (.github/workflows/ci.yml).
--
-- Cast: A is an admin, L is an approved leader, C is a co-leader, M is a
-- plain member, and O has no connection to the group at all.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

-- ----------------------------------------------------------------- setup (as the database owner)
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'leader@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', 'co@test.local',     'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'member@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'other@test.local',  'authenticated', 'authenticated');

update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';
update profiles set leader_status = 'approved' where user_id in
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');

-- A group led by L, with C as co-leader and M as a member.
insert into groups (id, name, join_code, leader_id) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Test group', '9001', '00000000-0000-0000-0000-0000000000b1');
insert into group_members (group_id, user_id, display_name, is_co_leader) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000b1', 'Leader', false),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000c1', 'Co', true),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'Member', false);
insert into group_messages (group_id, user_id, body) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'hello from M'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'second from M'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000b1', 'hello from the leader');

-- ----------------------------------------------------------------- a plain learner (M)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$update profiles set role = 'admin' where user_id = auth.uid()$$, null, null,
  'a learner cannot make themselves an admin');
select throws_ok($$update profiles set leader_status = 'approved' where user_id = auth.uid()$$, null, null,
  'a learner cannot approve themselves as a leader');
select throws_ok($$select create_group('My own group', 'M')$$, null, null,
  'a learner without leader status cannot create a group');
select throws_ok($$select * from admin_learners()$$, null, null, 'a learner cannot list learners');
select throws_ok($$select reminders_due(current_date)$$, null, null,
  'a learner cannot call the reminder lookup');
select throws_ok($$select set_co_leader('00000000-0000-0000-0000-00000000aaaa', auth.uid(), true)$$, null, null,
  'a member cannot make themselves co-leader');
select throws_ok($$select set_group_plan('00000000-0000-0000-0000-00000000aaaa', 'x', '[]'::jsonb)$$, null, null,
  'a member cannot set the reading plan');
select is((with u as (update groups set name = 'Hacked' returning 1) select count(*) from u), 0::bigint,
  'a member cannot rename the group');
select is((select count(*) from group_messages where group_id = '00000000-0000-0000-0000-00000000aaaa'), 3::bigint,
  'a member can read their group chat');
select is((with d as (delete from group_messages where user_id <> auth.uid() returning 1) select count(*) from d), 0::bigint,
  'a member cannot delete other people''s messages');
select lives_ok($$insert into group_reading_checks (group_id, user_id, read_on)
  values ('00000000-0000-0000-0000-00000000aaaa', auth.uid(), current_date)$$,
  'a member can tick their own reading');
select throws_ok($$insert into group_reading_checks (group_id, user_id, read_on)
  values ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000c1', current_date)$$, null, null,
  'a member cannot tick someone else''s reading');
select lives_ok($$insert into lesson_feedback (user_id, section, module_index, helpful)
  values (auth.uid(), 'introduction', 0, true)$$, 'a learner can give lesson feedback');
select throws_ok($$insert into site_text (id, content) values ('testimony:en', '{}'::jsonb)$$, null, null,
  'a learner cannot edit the home page text');

-- ----------------------------------------------------------------- someone outside the group (O)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*) from group_messages), 0::bigint, 'an outsider cannot read the chat');
select is((select count(*) from groups), 0::bigint, 'an outsider cannot see the group');
select is((select count(*) from group_reading_checks), 0::bigint, 'an outsider cannot see reading ticks');
select is((select count(*) from lesson_feedback), 0::bigint, 'a learner sees only their own lesson feedback');
select throws_ok($$insert into group_messages (group_id, user_id, body)
  values ('00000000-0000-0000-0000-00000000aaaa', auth.uid(), 'let me in')$$, null, null,
  'an outsider cannot post in the chat');

-- ----------------------------------------------------------------- joining
select lives_ok($$select join_group('9001', 'Other')$$, 'a signed-in person can join with the code');
select is((select count(*) from group_members where group_id = '00000000-0000-0000-0000-00000000aaaa'), 4::bigint,
  'after joining they can see the roster');

-- ----------------------------------------------------------------- the co-leader (C)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$update groups set name = 'Renamed by co-leader' where id = '00000000-0000-0000-0000-00000000aaaa'$$,
  null, null, 'a co-leader cannot rename the group');
select lives_ok($$update groups set votd_day = 3 where id = '00000000-0000-0000-0000-00000000aaaa'$$,
  'a co-leader can change the verse of the day');
select lives_ok($$select set_group_plan('00000000-0000-0000-0000-00000000aaaa', 'Plan', '[]'::jsonb)$$,
  'a co-leader can set the reading plan');
select throws_ok($$select set_co_leader('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', true)$$,
  null, null, 'a co-leader cannot name another co-leader');
select throws_ok($$select regenerate_group_code('00000000-0000-0000-0000-00000000aaaa')$$, null, null,
  'a co-leader cannot change the join code');
select throws_ok($$select set_group_archived('00000000-0000-0000-0000-00000000aaaa', true)$$, null, null,
  'a co-leader cannot archive the group');
select is((with d as (delete from group_members
              where group_id = '00000000-0000-0000-0000-00000000aaaa'
                and user_id = '00000000-0000-0000-0000-0000000000b1' returning 1) select count(*) from d), 0::bigint,
  'a co-leader cannot remove the leader');
select lives_ok($$delete from group_messages where body = 'second from M'$$, 'a co-leader can delete a message');
select is((with d as (delete from group_members
              where group_id = '00000000-0000-0000-0000-00000000aaaa'
                and user_id = '00000000-0000-0000-0000-0000000000e1' returning 1) select count(*) from d), 1::bigint,
  'a co-leader can remove an ordinary member');

-- ----------------------------------------------------------------- the leader (L)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$select set_co_leader('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', true)$$,
  'the leader can name a co-leader');
select throws_ok($$select transfer_group_leadership('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1')$$,
  null, null, 'a group can only be handed to an approved leader');
-- ----------------------------------------------------------------- the admin (A)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$select * from admin_learners()$$, 'an admin can list learners');
select lives_ok($$insert into site_text (id, content) values ('testimony:en', '{"title":"t","sign":"s","paragraphs":["p"]}'::jsonb)$$,
  'an admin can edit the home page text');
select is((select count(*) from lesson_feedback), 1::bigint, 'an admin can read everyone''s lesson feedback');

-- ----------------------------------------------------------------- signed out (anon)
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is((select count(*) from site_text), 1::bigint, 'anyone, even signed out, can read the home page text');
select is((select count(*) from groups), 0::bigint, 'a signed-out visitor cannot see groups');

reset role;
select * from finish();
rollback;
