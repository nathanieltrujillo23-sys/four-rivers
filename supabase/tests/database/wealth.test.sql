-- 4 Rivers: tests for Wealth Tools (the request, the approval, and each person's private workspace).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

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
select throws_ok($$select save_wealth_plan('{"goals":[]}'::jsonb)$$, null, null,
  'before approval a learner cannot save a plan');
select throws_ok($$select * from admin_wealth_requests()$$, null, null, 'a learner cannot list the requests');
select lives_ok($$select request_wealth('I lead a study group')$$, 'a learner can ask for wealth tools');
select is((select wealth_status from profiles where user_id = auth.uid()), 'requested', 'and is then marked as requested');
select throws_ok($$select admin_set_wealth(auth.uid(), true)$$, null, null, 'a learner cannot approve a request');
select throws_ok($$select save_wealth_tool('budget', '{"a":1}'::jsonb)$$, null, null,
  'a request alone does not open the workspace');

-- ----------------------------------------------------------------- the admin approves
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from admin_wealth_requests() where status = 'requested'), 1::bigint, 'the admin sees the request');
select lives_ok($$select admin_set_wealth('00000000-0000-0000-0000-0000000000d1', true)$$, 'the admin can approve it');

-- ----------------------------------------------------------------- the approved person's own workspace
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select save_wealth_plan('{"goals":[{"name":"Emergency fund"}]}'::jsonb)$$, 'an approved person can save their plan');
select lives_ok($$select save_wealth_tool('budget', '{"income":3000}'::jsonb)$$, 'and a tool''s numbers');
select lives_ok($$select save_wealth_tool('debt', '{"balance":900}'::jsonb)$$, 'a second tool is kept beside the first');
select is((select count(*) from jsonb_object_keys((select tools from wealth_workspaces where user_id = auth.uid()))), 2::bigint,
  'both tools are saved in their own workspace');
select is(rows_changed($$update wealth_workspaces set tools = '{}'::jsonb$$), 0::bigint,
  'the workspace cannot be rewritten directly');

-- ----------------------------------------------------------------- someone else never sees it
reset role;
insert into profiles (user_id) values ('00000000-0000-0000-0000-0000000000d2') on conflict do nothing;
update profiles set wealth_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000d2';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_workspaces), 0::bigint, 'another approved person sees none of it');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_workspaces), 0::bigint, 'and neither does an admin');

reset role;
select * from finish();
rollback;
