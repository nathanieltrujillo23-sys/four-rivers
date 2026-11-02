-- 4 Rivers: tests for declined requests, the admin's waiting count, and the new-leader nudge.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c4', 'c@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000c1';

-- Two people ask: one for leader status, one for Wealth Tools.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
set local role authenticated;
select request_leader('Please');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
set local role authenticated;
select request_wealth('Please');

-- Only an admin sees the waiting count.
select throws_ok($$select * from admin_pending_counts()$$, null, null, 'a person cannot see the waiting count');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select is((select waiting from admin_pending_counts() where kind = 'leader'), 1::bigint, 'an admin sees one leader request waiting');
select is((select waiting from admin_pending_counts() where kind = 'wealth'), 1::bigint, 'and one Wealth Tools request');

-- Declining tells the person, with the reason.
select lives_ok($$select admin_decline_request('leader', '00000000-0000-0000-0000-0000000000c2', 'Please finish the course first')$$, 'the admin declines a request with a reason');
reset role;
select is((select leader_status from profiles where user_id = '00000000-0000-0000-0000-0000000000c2'), 'none', 'the person is back to no status, free to ask again');
select is((select note from account_notices where user_id = '00000000-0000-0000-0000-0000000000c2' and kind = 'leader_declined'), 'Please finish the course first', 'and has a notice with the reason');

-- Declining something that is not waiting does nothing.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select admin_decline_request('leader', '00000000-0000-0000-0000-0000000000c4', 'x');
reset role;
select is((select count(*) from account_notices where user_id = '00000000-0000-0000-0000-0000000000c4'), 0::bigint, 'declining someone with no request gives no notice');

-- The nudge: an approved leader with no group, approved a few days ago.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select admin_set_leader('00000000-0000-0000-0000-0000000000c3', true);
select admin_set_leader('00000000-0000-0000-0000-0000000000c4', true);
reset role;
insert into groups (name, join_code, leader_id) values ('Has a group', '9999', '00000000-0000-0000-0000-0000000000c4');
select is((select count(*) from claim_leader_nudges(3)), 0::bigint, 'nobody is nudged on the day they are approved');
update account_notices set created_at = now() - interval '4 days' where kind = 'leader_approved';
select is((select count(*) from claim_leader_nudges(3)), 1::bigint, 'later, the leader with no group is nudged');
select is((select count(*) from account_notices where kind = 'leader_no_group'), 1::bigint, 'with a notice in their bell');
select is((select count(*) from claim_leader_nudges(3)), 0::bigint, 'only once');
select is((select count(*) from account_notices where kind = 'leader_no_group' and user_id = '00000000-0000-0000-0000-0000000000c4'), 0::bigint, 'and the leader who made a group is left alone');
select throws_ok($$set local role authenticated; select * from claim_leader_nudges(3)$$, null, null, 'a signed-in person cannot run the nudge');

select * from finish();
rollback;
