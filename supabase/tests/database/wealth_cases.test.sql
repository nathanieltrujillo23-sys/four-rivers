-- 4 Rivers: tests for the Wealth Tools case library and peer review.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'author@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'peer@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e3', 'outsider@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e4', 'peer2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e5', 'admin@test.local', 'authenticated', 'authenticated');
update profiles set wealth_status = 'approved' where user_id in
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e4');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000e5';
update profiles set display_name = 'Avery' where user_id = '00000000-0000-0000-0000-0000000000e1';

-- Someone without Wealth Tools can do none of it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select publish_wealth_case('Case', '', '{"client":{}}'::jsonb, '{}'::jsonb, true)$$, null, null, 'without Wealth Tools a person cannot publish');
select is((select count(*) from wealth_cases), 0::bigint, 'or read the library');

-- The author publishes, with and without a name.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select publish_wealth_case('College junior, tip income', 'Variable income and a first investment account', '{"client":{"name":"Client A"}}'::jsonb, '{}'::jsonb, true)$$, 'an approved person can publish a case');
select lives_ok($$select publish_wealth_case('Second case', '', '{"client":{"name":"Client A"}}'::jsonb, '{}'::jsonb, false)$$, 'and one without their name');
select is((select author_name from wealth_cases where title = 'College junior, tip income'), 'Avery', 'the name is the profile name');
select is((select author_name from wealth_cases where title = 'Second case'), '', 'or blank when they ask to stay unnamed');
select throws_ok($$select review_wealth_case((select id from wealth_cases where title = 'Second case'), '{"discovery":3,"goals":3,"rigor":3,"assumptions":3,"communication":3,"compliance":3}'::jsonb, '', '')$$, null, null, 'nobody reviews their own case');

-- A peer reads the library and reviews.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_cases), 2::bigint, 'another approved person reads the library');
select throws_ok($$select review_wealth_case((select id from wealth_cases where title = 'Second case'), '{"discovery":5,"goals":3,"rigor":3,"assumptions":3,"communication":3,"compliance":3}'::jsonb, '', '')$$, null, null, 'scores outside 1 to 4 are refused');
select throws_ok($$select review_wealth_case((select id from wealth_cases where title = 'Second case'), '{"discovery":3}'::jsonb, '', '')$$, null, null, 'every rubric line must be scored');
select lives_ok($$select review_wealth_case((select id from wealth_cases where title = 'Second case'), '{"discovery":3,"goals":4,"rigor":2,"assumptions":3,"communication":3,"compliance":4}'::jsonb, 'Clear goals', 'Show the assumptions')$$, 'a peer can review');
select lives_ok($$select review_wealth_case((select id from wealth_cases where title = 'Second case'), '{"discovery":4,"goals":4,"rigor":2,"assumptions":3,"communication":3,"compliance":4}'::jsonb, 'Clear goals', 'Show the assumptions')$$, 'and review again');
select is((select count(*) from wealth_case_reviews), 1::bigint, 'which replaces the first review');

-- A second peer cannot read the first peer's review, but the author can.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_case_reviews), 0::bigint, 'another peer cannot read it');
select is((select reviews from wealth_case_review_counts() limit 1), 1::bigint, 'but sees that the case has a review');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_case_reviews), 1::bigint, 'the author reads reviews of their case');

-- Removing: only the author or an admin, and the reviews go with the case.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
set local role authenticated;
select delete_wealth_case((select id from wealth_cases where title = 'Second case'));
select is((select count(*) from wealth_cases), 2::bigint, 'a peer cannot remove someone else''s case');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
set local role authenticated;
select delete_wealth_case((select id from wealth_cases where title = 'Second case'));
select is((select count(*) from wealth_cases) || '/' || (select count(*) from wealth_case_reviews), '1/0', 'an admin can, and the reviews go with it');

reset role;
select * from finish();
rollback;
