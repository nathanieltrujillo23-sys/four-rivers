-- 4 Rivers: tests for saved versions of a client plan.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f3', 'c@test.local', 'authenticated', 'authenticated');
update profiles set wealth_status = 'approved' where user_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2');
insert into wealth_clients (id, user_id, name, plan) values
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-0000000000f1', 'Client A', '{"client":{"name":"Client A"}}'),
  ('00000000-0000-0000-0000-00000000c0b1', '00000000-0000-0000-0000-0000000000f2', 'Client B', '{"client":{"name":"Client B"}}');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select save_wealth_version('00000000-0000-0000-0000-00000000c0a1', 'x', '{"a":1}'::jsonb, '{}'::jsonb)$$, null, null, 'without Wealth Tools nothing can be saved');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select save_wealth_version('00000000-0000-0000-0000-00000000c0a1', 'After meeting 1', '{"client":{"name":"Client A"}}'::jsonb, '{"debt":{"extra":100}}'::jsonb)$$, 'a person can save a version of their own client plan');
select throws_ok($$select save_wealth_version('00000000-0000-0000-0000-00000000c0b1', 'x', '{"a":1}'::jsonb, '{}'::jsonb)$$, null, null, 'but not of someone else''s');
select throws_ok($$select save_wealth_version('00000000-0000-0000-0000-00000000c0a1', 'x', '"not an object"'::jsonb, '{}'::jsonb)$$, null, null, 'and a version needs a plan');
select is((select count(*) from wealth_versions), 1::bigint, 'they read their own version');
select is((select tools #>> '{debt,extra}' from wealth_versions), '100', 'with its toolkit numbers');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_versions), 0::bigint, 'another approved person sees none of it');
select delete_wealth_version((select id from wealth_versions limit 1));

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
set local role authenticated;
select delete_wealth_version((select id from wealth_versions limit 1));
select is((select count(*) from wealth_versions), 0::bigint, 'the owner can delete a version');

reset role;
delete from wealth_clients where id = '00000000-0000-0000-0000-00000000c0b1';
select lives_ok($$select 1$$, 'deleting a client plan is allowed');

select * from finish();
rollback;
