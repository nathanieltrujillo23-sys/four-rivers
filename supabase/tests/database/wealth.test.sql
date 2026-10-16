-- 4 Rivers: tests for Wealth Tools (the request, the approval, and each person's private workspace).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

-- Runs an UPDATE or DELETE and reports how many rows it changed (as whoever is signed in at that moment).
create function public.rows_changed(sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'with changed as (' || sql || ' returning 1) select count(*) from changed' into n;
  return n;
end $$;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'asker@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'other@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';

-- ----------------------------------------------------------------- a learner asks
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$update profiles set wealth_status = 'approved' where user_id = auth.uid()$$, null, null,
  'a learner cannot approve themselves for wealth tools');
select throws_ok($$select create_wealth_client('{"client":{"name":"Sam"}}'::jsonb)$$, null, null,
  'before approval a learner cannot start a client plan');
select throws_ok($$select * from admin_wealth_requests()$$, null, null, 'a learner cannot list the requests');
select lives_ok($$select request_wealth('I lead a study group')$$, 'a learner can ask for wealth tools');
select is((select wealth_status from profiles where user_id = auth.uid()), 'requested', 'and is then marked as requested');
select throws_ok($$select admin_set_wealth(auth.uid(), true)$$, null, null, 'a learner cannot approve a request');
select throws_ok($$select create_wealth_client('{}'::jsonb)$$, null, null, 'a request alone does not open the workspace');

-- ----------------------------------------------------------------- the admin approves
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from admin_wealth_requests() where status = 'requested'), 1::bigint, 'the admin sees the request');
select lives_ok($$select admin_set_wealth('00000000-0000-0000-0000-0000000000d1', true)$$, 'the admin can approve it');

-- ----------------------------------------------------------------- the approved analyst's own client plans
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
create temp table made (id uuid);
grant all on made to public;
insert into made select create_wealth_client('{"client":{"name":"Jordan"},"goals":[]}'::jsonb);
insert into made select create_wealth_client('{"client":{"name":"Priya"}}'::jsonb);
select is((select count(*) from wealth_clients), 2::bigint, 'an approved analyst can keep several client plans');
select is((select name from wealth_clients where plan -> 'client' ->> 'name' = 'Jordan'), 'Jordan', 'each is listed under the client''s name');
select lives_ok($$select save_wealth_client((select id from made limit 1), '{"client":{"name":"Jordan R"},"goals":[{"name":"Emergency fund"}]}'::jsonb)$$,
  'a plan can be saved');
select lives_ok($$select save_wealth_client_tool((select id from made limit 1), 'budget', '{"income":3000}'::jsonb)$$, 'and one tool''s numbers');
select lives_ok($$select save_wealth_client_tool((select id from made limit 1), 'debt', '{"balance":900}'::jsonb)$$, 'a second tool is kept beside the first');
select is((select count(*) from jsonb_object_keys((select tools from wealth_clients where plan -> 'client' ->> 'name' = 'Jordan R'))), 2::bigint,
  'both tools are kept with that client');
select is((select count(*) from jsonb_object_keys((select tools from wealth_clients where plan -> 'client' ->> 'name' = 'Priya'))), 0::bigint,
  'and not with the other client');
select throws_ok($$select save_wealth_client_tool((select id from made limit 1), 'Bad Tool!', '{}'::jsonb)$$, null, null, 'a made-up tool name is refused');

-- ----------------------------------------------------------------- someone else never sees or changes them
reset role;
insert into profiles (user_id) values ('00000000-0000-0000-0000-0000000000d2') on conflict do nothing;
update profiles set wealth_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000d2';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_clients), 0::bigint, 'another approved analyst sees none of them');
select throws_ok($$select save_wealth_client((select id from made limit 1), '{"client":{"name":"Hacked"}}'::jsonb)$$, null, null,
  'and cannot overwrite one');
select is(rows_changed($$update wealth_clients set tools = '{}'::jsonb$$), 0::bigint, 'nor edit the table directly');
select lives_ok($$select delete_wealth_client((select id from made limit 1))$$, 'a delete aimed at someone else''s plan does nothing');

reset role;
select is((select count(*) from wealth_clients where user_id = '00000000-0000-0000-0000-0000000000d1'), 2::bigint,
  'so the first analyst still has both plans');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_clients), 0::bigint, 'and an admin cannot read them either');

reset role;
select * from finish();
rollback;
