-- 4 Rivers: tests for the Investment Banking and Consulting tools (request, approval, notices, private workspaces).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'b@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';

-- A person asks for both, and cannot approve themselves.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select request_track_access('ib', 'Recruiting this spring')$$, 'a person asks for Investment Banking Tools');
select lives_ok($$select request_track_access('consulting', 'Case practice')$$, 'and for Consulting Tools');
select throws_ok($$select request_track_access('nope', '')$$, null, null, 'an unknown tool is refused');
-- (These flags last only for one request in real use; a test runs in one transaction, so clear them.)
select set_config('app.ib_rpc', 'off', true), set_config('app.consulting_rpc', 'off', true);
select throws_ok($$update profiles set ib_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000a2'$$, null, null, 'they cannot approve themselves');
select throws_ok($$select save_track_workspace('ib', '{"x":1}'::jsonb)$$, null, null, 'and cannot save a workspace before approval');
select throws_ok($$select * from admin_track_requests('ib')$$, null, null, 'nor read the admin list');

-- The admin sees the waiting requests and approves one and declines the other.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from admin_track_requests('ib') where status = 'requested'), 1::bigint, 'the admin sees the request');
select is((select waiting from admin_pending_counts() where kind = 'consulting'), 1::bigint, 'and the waiting count for consulting');
select lives_ok($$select admin_set_track_access('ib', '00000000-0000-0000-0000-0000000000a2', true)$$, 'the admin approves the banking request');
select lives_ok($$select admin_decline_request('consulting', '00000000-0000-0000-0000-0000000000a2', 'Try again after the case workshop')$$, 'and declines the consulting one with a reason');

reset role;
select is((select count(*) from account_notices where user_id = '00000000-0000-0000-0000-0000000000a2' and kind = 'ib_approved'), 1::bigint, 'the person has a notice that banking was approved');
select is((select note from account_notices where user_id = '00000000-0000-0000-0000-0000000000a2' and kind = 'consulting_declined'), 'Try again after the case workshop', 'and one that consulting was declined, with the reason');

-- The approved person saves and reads their workspace; nobody else can read it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select save_track_workspace('ib', '{"deals":[{"id":"d1"}]}'::jsonb)$$, 'the approved person saves their workspace');
select is((select data #>> '{deals,0,id}' from ib_workspaces), 'd1', 'and reads it back');
select throws_ok($$select save_track_workspace('consulting', '{"x":1}'::jsonb)$$, null, null, 'but not the one they were declined for');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from ib_workspaces), 0::bigint, 'another person sees no workspace');

select * from finish();
rollback;
