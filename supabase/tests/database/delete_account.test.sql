-- 4 Rivers: tests for deleting your own account (Update 42).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'leaver@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'leader@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'member@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c4', 'owner@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000c4';

-- the leaver has progress, a journal-like tracker entry and a practice day; the leader runs a group with a member
insert into course_progress (user_id, river_number, completed_at) values ('00000000-0000-0000-0000-0000000000c1', 1, now());
insert into giving_entries (user_id, recipient, amount) values ('00000000-0000-0000-0000-0000000000c1', 'Church', 50);
insert into practice_checkins (user_id, day) values ('00000000-0000-0000-0000-0000000000c1', 1);
insert into groups (id, name, join_code, leader_id) values ('00000000-0000-0000-0000-00000000aa01', 'Group', '7341', '00000000-0000-0000-0000-0000000000c2');
insert into group_members (group_id, user_id) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c3'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c1');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select delete_my_account('delete')$$, null, null, 'it needs the word DELETE exactly');
select lives_ok($$select delete_my_account('DELETE')$$, 'a learner can delete their own account');

reset role;
select is((select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint, 'the sign-in is gone');
select is((select count(*) from profiles where user_id = '00000000-0000-0000-0000-0000000000c1')
        + (select count(*) from course_progress where user_id = '00000000-0000-0000-0000-0000000000c1')
        + (select count(*) from giving_entries where user_id = '00000000-0000-0000-0000-0000000000c1')
        + (select count(*) from practice_checkins where user_id = '00000000-0000-0000-0000-0000000000c1')
        + (select count(*) from group_members where user_id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint,
  'and so is everything that belonged to it, including group membership');
select is((select count(*) from groups where id = '00000000-0000-0000-0000-00000000aa01'), 1::bigint, 'the group they were in is untouched');

-- a leader with members can't, an admin can't
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select delete_my_account('DELETE')$$, null, null, 'someone leading a group with members must hand it over first');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select delete_my_account('DELETE')$$, null, null, 'an admin account cannot be deleted this way');
reset role;
select is((select count(*) from auth.users where id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c4')), 2::bigint, 'both are still there');

-- signed out, nothing happens
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$select delete_my_account('DELETE')$$, null, null, 'signed out it does nothing');
reset role;

select * from finish();
rollback;
