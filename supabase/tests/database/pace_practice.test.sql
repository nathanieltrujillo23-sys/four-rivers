-- 4 Rivers: tests for the pace choice and 30 Days of Practice (Update 38).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'pace1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'pace2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e3', 'admin3@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000e3';

-- a learner picks a pace on their own profile
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update profiles set pace_days = 7, challenge_started_at = now() where user_id = auth.uid()$$, 'a learner can choose a one-week pace');
select throws_ok($$update profiles set pace_days = 30 where user_id = auth.uid()$$, '23514', null, 'only one week, two weeks or own pace are allowed');
select lives_ok($$update profiles set pace_days = 0, challenge_started_at = null where user_id = auth.uid()$$, 'or their own pace');

-- practice days are private to their owner
select lives_ok($$insert into practice_checkins (user_id, day, note) values (auth.uid(), 1, 'Wrote down every purchase')$$, 'a learner can check off a practice day');
select throws_ok($$insert into practice_checkins (user_id, day) values (auth.uid(), 31)$$, '23514', null, 'there are only 30 days');
select throws_ok($$insert into practice_checkins (user_id, day) values ('00000000-0000-0000-0000-0000000000e2', 2)$$, '42501', null, 'nobody can check off a day for someone else');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from practice_checkins), 0::bigint, 'another learner sees none of it');
update practice_checkins set note = 'changed' where day = 1;
reset role;
select is((select note from practice_checkins where user_id = '00000000-0000-0000-0000-0000000000e1' and day = 1), 'Wrote down every purchase', 'and cannot change it');

-- the owner can undo a day
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
delete from practice_checkins where day = 1;
select is((select count(*) from practice_checkins), 0::bigint, 'the owner can undo a day');
insert into practice_checkins (user_id, day) values (auth.uid(), 3);
update profiles set practice_started_at = now(), pace_days = 14, pace_note = true where user_id = auth.uid();

-- an admin reset clears the pace and the practice
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select admin_reset_account('00000000-0000-0000-0000-0000000000e1');
reset role;
select is((select count(*) from practice_checkins where user_id = '00000000-0000-0000-0000-0000000000e1'), 0::bigint, 'a reset clears the practice days');
select is((select pace_days is null and not pace_note and practice_started_at is null from profiles where user_id = '00000000-0000-0000-0000-0000000000e1'), true, 'and the pace');

select * from finish();
rollback;
