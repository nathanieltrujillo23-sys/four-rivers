-- 4 Rivers: tests for the notice a person gets when an admin approves their request.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'leader@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b3', 'other@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000b1';

-- The person asks.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select request_leader('I would like to lead a group')$$, 'a person asks to lead a group');
select is((select count(*) from account_notices), 0::bigint, 'asking creates no notice');

-- The admin approves.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select admin_set_leader('00000000-0000-0000-0000-0000000000b2', true)$$, 'the admin approves the request');

reset role;
select is((select count(*) from account_notices where user_id = '00000000-0000-0000-0000-0000000000b2' and kind = 'leader_approved'), 1::bigint, 'the person gets a notice');

-- Approving again changes nothing, and un-approving then approving gives a fresh one.
set local role authenticated;
select lives_ok($$select admin_set_leader('00000000-0000-0000-0000-0000000000b2', true)$$, 'approving twice is harmless');
reset role;
select is((select count(*) from account_notices where user_id = '00000000-0000-0000-0000-0000000000b2'), 1::bigint, 'and gives no second notice');

-- The person reads their own notice and marks it seen; nobody else sees it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select is((select (my_account_notices() -> 0 ->> 'unread')), 'true', 'it shows as unread');
select mark_account_notices_seen();
select is((select (my_account_notices() -> 0 ->> 'unread')), 'false', 'and as seen afterward');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from account_notices), 0::bigint, 'another person sees none of it');

-- An admin approving their own account is not told.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select admin_set_leader('00000000-0000-0000-0000-0000000000b1', true);
reset role;
select is((select count(*) from account_notices where user_id = '00000000-0000-0000-0000-0000000000b1'), 0::bigint, 'an admin approving themselves gets no notice');

select * from finish();
rollback;
