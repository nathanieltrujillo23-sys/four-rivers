-- 4 Rivers: tests for spaced review (Update 40).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'rev1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'rev2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b3', 'revadmin@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000b3';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into quiz_reviews (user_id, river, round, score) values (auth.uid(), 2, 1, 3)$$, 'a learner can record a finished review');
select throws_ok($$insert into quiz_reviews (user_id, river, round, score) values (auth.uid(), 2, 4, 3)$$, '23514', null, 'there are only three rounds');
select throws_ok($$insert into quiz_reviews (user_id, river, round, score) values ('00000000-0000-0000-0000-0000000000b2', 1, 1, 3)$$, '42501', null, 'nobody can record one for someone else');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from quiz_reviews), 0::bigint, 'another learner sees none of it');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select admin_reset_account('00000000-0000-0000-0000-0000000000b1')$$, 'an admin can reset the account');
reset role;
select is((select count(*) from quiz_reviews where user_id = '00000000-0000-0000-0000-0000000000b1'), 0::bigint, 'and the reviews are cleared');

select * from finish();
rollback;
