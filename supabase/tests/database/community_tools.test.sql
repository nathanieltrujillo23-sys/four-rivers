-- 4 Rivers: tests for the recruiting calendar, the practice board and the usage summary.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b3', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b4', 'c@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000b1';
update profiles set ib_status = 'approved', display_name = 'Avery' where user_id = '00000000-0000-0000-0000-0000000000b2';
update profiles set ib_status = 'approved', display_name = 'Blake' where user_id = '00000000-0000-0000-0000-0000000000b3';

-- The admin enters a recruiting window; a person approved for the tool reads it; an outsider does not.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select admin_save_recruiting_window(null, 'ib', 'Example Bank', 'Summer analyst', null, '2026-12-01', '2026-11-02', '', '')$$, null, null, 'a person cannot enter a window');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select admin_save_recruiting_window(null, 'ib', 'Example Bank', 'Summer analyst', '2026-09-01', '2026-12-01', '2026-11-02', 'https://example.com/careers', 'Check the page')$$, 'an admin enters a window');
select throws_ok($$select admin_save_recruiting_window(null, 'nope', 'X', '', null, null, null, '', '')$$, null, null, 'for a real tool only');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from recruiting_windows), 1::bigint, 'an approved person reads it');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from recruiting_windows), 0::bigint, 'someone not approved does not');

-- The practice board: post, see, respond, and who sees the contact.
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select post_practice('ib', 'LBO walk-through', 'Thursday evenings', 'text 555-0100')$$, 'a person posts a practice request');
select throws_ok($$select post_practice('consulting', 'Cases', '', '')$$, null, null, 'but not for a tool they are not approved for');
select is((select contact from practice_board('ib') limit 1), 'text 555-0100', 'the poster sees their own contact');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
set local role authenticated;
select is((select contact from practice_board('ib') limit 1), '', 'another person does not, until they offer');
select lives_ok($$select respond_practice((select id from practice_board('ib') limit 1), 'I can do Thursday')$$, 'they offer to practice');
select is((select contact from practice_board('ib') limit 1), 'text 555-0100', 'and then see the contact');
select throws_ok($$select * from practice_responders((select id from practice_board('ib') limit 1))$$, null, null, 'they cannot read the list of offers');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
select is((select name from practice_responders((select id from practice_board('ib') limit 1))), 'Blake', 'the poster sees who offered');
select lives_ok($$select close_practice((select id from practice_board('ib') limit 1))$$, 'the poster closes the request');
select is((select count(*) from practice_board('ib')), 0::bigint, 'and it leaves the board');

-- The usage summary is for admins and holds counts only.
select throws_ok($$select admin_tool_usage()$$, null, null, 'a person cannot read the usage summary');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is((admin_tool_usage() -> 'approved' ->> 'ib'), '2', 'an admin sees how many are approved');

select * from finish();
rollback;
