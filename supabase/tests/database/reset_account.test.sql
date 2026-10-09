-- 4 Rivers: tests for an admin resetting any account's progress.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'learner@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'friend@test.local',  'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';

-- two learners with progress, entries, and an exam result
insert into course_progress (user_id, river_number, completed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 1, now()), ('00000000-0000-0000-0000-0000000000d2', 1, now());
insert into module_views (user_id, section, module_index) values
  ('00000000-0000-0000-0000-0000000000d1', '1', 0), ('00000000-0000-0000-0000-0000000000d2', '1', 0);
insert into income_streams (user_id, name, amount) values
  ('00000000-0000-0000-0000-0000000000d1', 'Job', 1000), ('00000000-0000-0000-0000-0000000000d2', 'Job', 1000);
insert into giving_entries (user_id, recipient, amount) values
  ('00000000-0000-0000-0000-0000000000d1', 'Church', 50), ('00000000-0000-0000-0000-0000000000d2', 'Church', 50);
update profiles set exam_passed_at = now(), exam_best_score = 45, challenge_started_at = now()
  where user_id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
insert into certificate_verifications (user_id, display_name, exam_passed_at, exam_best_score) values
  ('00000000-0000-0000-0000-0000000000d1', 'Learner', now(), 45), ('00000000-0000-0000-0000-0000000000d2', 'Friend', now(), 45);

-- a learner cannot reset anyone, not even themselves through this
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select admin_reset_account('00000000-0000-0000-0000-0000000000d1')$$, null, null, 'a learner cannot reset another account');

-- the admin resets one learner
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select admin_reset_account('00000000-0000-0000-0000-0000000000d1')$$, 'an admin can reset an account');
select throws_ok($$select admin_reset_account('00000000-0000-0000-0000-0000000000ff')$$, null, null, 'an account that does not exist is refused');

reset role;
select is((select count(*) from course_progress where user_id = '00000000-0000-0000-0000-0000000000d1'), 0::bigint, 'their rivers are cleared');
select is((select count(*) from module_views where user_id = '00000000-0000-0000-0000-0000000000d1')
        + (select count(*) from income_streams where user_id = '00000000-0000-0000-0000-0000000000d1')
        + (select count(*) from giving_entries where user_id = '00000000-0000-0000-0000-0000000000d1')
        + (select count(*) from certificate_verifications where user_id = '00000000-0000-0000-0000-0000000000d1'), 0::bigint,
  'so are their modules, tracker entries, and certificate');
select is((select exam_passed_at is null and exam_best_score is null and challenge_started_at is null
           from profiles where user_id = '00000000-0000-0000-0000-0000000000d1'), true, 'and their exam result and challenge');
select is((select count(*) from course_progress where user_id = '00000000-0000-0000-0000-0000000000d2')
        + (select count(*) from module_views where user_id = '00000000-0000-0000-0000-0000000000d2')
        + (select count(*) from income_streams where user_id = '00000000-0000-0000-0000-0000000000d2')
        + (select count(*) from giving_entries where user_id = '00000000-0000-0000-0000-0000000000d2'), 4::bigint,
  'nobody else''s progress is touched');
select is((select exam_best_score from profiles where user_id = '00000000-0000-0000-0000-0000000000d2'), 45, 'nor their exam result');
select is((select count(*) from profiles where user_id = '00000000-0000-0000-0000-0000000000d1'), 1::bigint, 'the account itself is kept');

select * from finish();
rollback;
