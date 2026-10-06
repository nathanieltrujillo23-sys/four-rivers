-- 4 Rivers: permission tests for learner activity, saved scenarios, analytics, leader progress, and the digest.
-- Cast: A is an admin, L the group's leader, M a plain member, O has no connection to the group.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'leader@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'member@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'other@test.local',  'authenticated', 'authenticated');

update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';
update profiles set leader_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000b1';

insert into groups (id, name, join_code, leader_id) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Test group', '9002', '00000000-0000-0000-0000-0000000000b1');
insert into group_members (group_id, user_id, display_name) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000b1', 'Leader'),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'Member');
insert into group_readings (group_id, read_on, passages) values
  ('00000000-0000-0000-0000-00000000aaaa', current_date, 'Luke 1');
insert into group_reading_checks (group_id, user_id, read_on) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', current_date);

-- ----------------------------------------------------------------- a plain member (M)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$select admin_learner_activity(auth.uid())$$, null, null, 'a learner cannot read learner activity');
select throws_ok($$select admin_analytics()$$, null, null, 'a learner cannot read the analytics');
select throws_ok($$select * from admin_question_stats()$$, null, null, 'a learner cannot read question statistics');
select throws_ok($$select * from group_member_progress('00000000-0000-0000-0000-00000000aaaa')$$, null, null,
  'a plain member cannot see how others are doing in the course');
select throws_ok($$select * from leader_digest(current_date - 7, current_date)$$, null, null,
  'a learner cannot call the leader digest');
select lives_ok($$select touch_last_seen()$$, 'the app can note when someone last used it');
select lives_ok($$select record_question_stats('q1', 10, array[2, 5])$$, 'a learner can report which questions they missed');
select lives_ok($$insert into calculator_scenarios (user_id, tool, name, data)
  values (auth.uid(), 'budget', 'My plan', '{"income": 3000}'::jsonb)$$, 'a learner can save a calculator scenario');
select throws_ok($$insert into calculator_scenarios (user_id, tool, name, data)
  values ('00000000-0000-0000-0000-0000000000e1', 'budget', 'Not mine', '{}'::jsonb)$$, null, null,
  'a learner cannot save a scenario for someone else');

-- ----------------------------------------------------------------- someone else (O)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from calculator_scenarios), 0::bigint, 'scenarios are private to their owner');

-- ----------------------------------------------------------------- the leader (L)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from group_member_progress('00000000-0000-0000-0000-00000000aaaa')), 2::bigint,
  'a leader sees every member''s course progress');

-- ----------------------------------------------------------------- the admin (A)
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select (admin_learner_activity('00000000-0000-0000-0000-0000000000d1')::jsonb) ->> 'email'), 'member@test.local',
  'an admin can read one learner''s activity');
select ok((select (admin_learner_activity('00000000-0000-0000-0000-0000000000d1')::jsonb ->> 'last_seen_at') is not null),
  'the activity shows when the learner last used the app');
select is((select (admin_analytics()::jsonb ->> 'learners')::int), 4, 'an admin can read the analytics');
select is((select attempts from admin_question_stats() where section = 'q1' and idx = 2), 1, 'question statistics add up');
select is((select misses from admin_question_stats() where section = 'q1' and idx = 3), 0, 'a question answered correctly has no misses');

-- ----------------------------------------------------------------- the scheduled job (service role)
reset role;
set local role service_role;
select is((select count(*) from leader_digest(current_date - 7, current_date)), 1::bigint,
  'the digest goes to the group''s leader only');

reset role;
select * from finish();
rollback;
