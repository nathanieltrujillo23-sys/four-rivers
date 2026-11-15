-- 4 Rivers: tests for the Daily Bread members' space, its weekly brief, the opt-in directory, and peer review of models.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'banker@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d3', 'consultant@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d4', 'outsider@test.local', 'authenticated', 'authenticated');
update profiles set role = 'admin', display_name = 'Admin' where user_id = '00000000-0000-0000-0000-0000000000d1';
update profiles set display_name = 'Bea Banker' where user_id = '00000000-0000-0000-0000-0000000000d2';
update profiles set display_name = 'Cal Consultant' where user_id = '00000000-0000-0000-0000-0000000000d3';

-- The admin approves one person for banking tools and one for both banking and consulting.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select admin_set_track_access('ib', '00000000-0000-0000-0000-0000000000d2', true);
select admin_set_track_access('ib', '00000000-0000-0000-0000-0000000000d3', true);
select admin_set_track_access('consulting', '00000000-0000-0000-0000-0000000000d3', true);

-- ---- The space ----
select is((select id from join_daily_bread('Admin')), null::uuid, 'before it is set up, opening the space returns nothing');
select lives_ok($$select admin_create_daily_bread_group('Admin')$$, 'an admin sets up the space');
select is((select count(*) from groups where daily_bread), 1::bigint, 'there is one Daily Bread group');
select is((select id from admin_create_daily_bread_group('Admin')), (select id from groups where daily_bread), 'setting it up again returns the same group');
select is((select join_enabled from groups where daily_bread), false, 'it cannot be joined with a code');
select throws_ok($$update groups set daily_bread = false where daily_bread$$, null, null, 'its leader cannot turn the flag off');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select name from join_daily_bread('Bea')), 'Daily Bread', 'an approved member is let in');
select is((select count(*) from join_daily_bread('Bea')), 1::bigint, 'opening it twice is harmless');
select throws_ok($$select admin_create_daily_bread_group('Bea')$$, null, null, 'a member cannot set up the space');
select throws_ok(format($$select join_group(%L, 'Bea')$$, (select join_code from groups where daily_bread)), null, null, 'and the code does not work');
reset role;
select is((select count(*) from group_members m join groups g on g.id = m.group_id where g.daily_bread), 2::bigint, 'the admin and the member are in the group, once each');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select join_daily_bread('Outsider')$$, null, null, 'someone with no tool set is refused');
select is((select count(*) from daily_bread_briefs), 0::bigint, 'and cannot read briefs');
select throws_ok($$select * from daily_bread_directory()$$, null, null, 'or the directory');
reset role;

-- ---- The weekly brief ----
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select admin_save_brief(null, '2026-11-09', 'Week one', 'Rates held.', 'Be faithful in little.', 'Luke 16:10', 'ESV', 'One who is faithful in a very little is also faithful in much.')$$, null, null, 'a member cannot write a brief');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select admin_save_brief(null, '2026-11-09', 'Week one', 'Rates held.', 'Be faithful in little.', 'Luke 16:10', 'ESV', 'One who is faithful in a very little is also faithful in much.')$$, 'an admin writes a brief');
select lives_ok(format($$select admin_save_brief(%L, '2026-11-09', 'Week one, revised', 'Rates held steady.', '', '', 'KJV', '')$$, (select id from daily_bread_briefs)), 'and edits it');
select throws_ok($$select admin_save_brief(null, '2026-11-16', 'Bad', '', '', '', 'MSG', '')$$, null, null, 'only the four translations are accepted');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
set local role authenticated;
select is((select title from daily_bread_briefs), 'Week one, revised', 'members read the brief');
select throws_ok($$insert into daily_bread_briefs (week_of, title) values ('2026-11-16', 'Sneaky')$$, null, null, 'and cannot insert one directly');

-- ---- The directory ----
select is((select count(*) from daily_bread_directory()), 0::bigint, 'nobody is listed until they choose to be');
select set_directory_entry(true, 'Sophomore, finance. Interested in restructuring.');
select is((select line from my_directory_entry()), 'Sophomore, finance. Interested in restructuring.', 'a member saves their own line');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select display_name || ':' || ib::text || ':' || consulting::text || ':' || wealth::text from daily_bread_directory()), 'Cal Consultant:true:true:false', 'others see the name, the line and the tool sets, and nothing else');

-- ---- Peer review of models ----
select lives_ok($$select share_model('ib', 'dcf', 'My first DCF', 'Is my terminal growth too high?', '{"dcf":{"wacc":"9"}}'::jsonb, true)$$, 'a member shares a banking model');
select throws_ok($$select share_model('consulting', 'storyline', 'Not mine to share', '', '{}'::jsonb, true)$$, null, null, 'but not in a tool set they do not have');
select throws_ok(format($$select review_model(%L, '{"structure":3,"assumptions":3,"accuracy":3,"communication":3}'::jsonb, 'x', 'y')$$, (select id from model_shares)), null, null, 'nobody reviews their own model');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
set local role authenticated;
select is((select author_name from model_shares where track = 'ib'), 'Bea Banker', 'another banking member sees it, with the author''s name');
select throws_ok(format($$select review_model(%L, '{"structure":3,"assumptions":9,"accuracy":3,"communication":3}'::jsonb, 'x', 'y')$$, (select id from model_shares)), null, null, 'a review needs every score from 1 to 4');
select lives_ok(format($$select review_model(%L, '{"structure":3,"assumptions":2,"accuracy":4,"communication":3}'::jsonb, 'Clear layout.', 'Defend the growth rate.')$$, (select id from model_shares)), 'and can be reviewed');
select is((select reviews from model_review_counts('ib')), 1::bigint, 'the count shows one review');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from model_shares) + (select count(*) from model_reviews), 0::bigint, 'an outsider sees neither the model nor the review');
select throws_ok($$select share_model('wealth', 'backtest', 'Not allowed', '', '{}'::jsonb, true)$$, null, null, 'and cannot share a wealth model');
reset role;

-- ---- Wealth models join peer review, under Wealth Tools approval ----
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select admin_set_wealth('00000000-0000-0000-0000-0000000000d4', true);
select lives_ok($$select share_model('wealth', 'backtest', 'A 60/40 backtest', 'Is the period too kind?', '{"backtest":{"start":"1976"}}'::jsonb, false)$$, 'someone with Wealth Tools shares a wealth model');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from model_shares where track = 'wealth'), 1::bigint, 'another person with Wealth Tools sees it');
select is((select count(*) from model_shares where track = 'ib'), 0::bigint, 'but still not the banking models');
select lives_ok(format($$select review_model(%L, '{"structure":3,"assumptions":3,"accuracy":4,"communication":3}'::jsonb, 'Good.', 'Try a harder period.')$$, (select id from model_shares where track = 'wealth')), 'and reviews it');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from model_shares where track = 'wealth'), 0::bigint, 'a banking-only member does not see wealth models');

select * from finish();
