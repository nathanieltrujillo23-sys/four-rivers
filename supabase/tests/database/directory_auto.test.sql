-- 4 Rivers: tests for listing Daily Bread members in the directory when they join (Update 44).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e7', 'joiner@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e8', 'outsider@test.local', 'authenticated', 'authenticated');

select is((select directory_opt_in from profiles where user_id = '00000000-0000-0000-0000-0000000000e7'), false, 'someone who is not a member is not listed');

-- an admin approves the first tool set: that is joining
update profiles set wealth_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000e7';
select is((select directory_opt_in from profiles where user_id = '00000000-0000-0000-0000-0000000000e7'), true, 'joining Daily Bread lists them in the directory');

-- they can remove themselves, and it sticks when another tool set is approved later
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select set_directory_entry(false, '')$$, 'a member can remove themselves');
reset role;
select set_config('request.jwt.claims', '', true);
update profiles set ib_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000e7';
select is((select directory_opt_in from profiles where user_id = '00000000-0000-0000-0000-0000000000e7'), false, 'a second tool set does not list them again');

-- other profile changes never list anyone
update profiles set display_name = 'Someone' where user_id = '00000000-0000-0000-0000-0000000000e8';
select is((select directory_opt_in from profiles where user_id = '00000000-0000-0000-0000-0000000000e8'), false, 'an ordinary profile change lists no one');

-- losing every tool set and joining again lists them again
update profiles set wealth_status = 'none', ib_status = 'none' where user_id = '00000000-0000-0000-0000-0000000000e7';
update profiles set consulting_status = 'approved' where user_id = '00000000-0000-0000-0000-0000000000e7';
select is((select directory_opt_in from profiles where user_id = '00000000-0000-0000-0000-0000000000e7'), true, 'joining again lists them again');

select * from finish();
rollback;
