-- 4 Rivers: tests for the Discovery workshop and the permanent group settings.
-- Cast: O owns the group, C is a co-leader, M is a plain member, X is outside the group.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner@test.local',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', 'co@test.local',     'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'member@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'other@test.local',  'authenticated', 'authenticated');
update profiles set leader_status = 'approved' where user_id in
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');

insert into groups (id, name, join_code, leader_id, workshop_enabled, verse_locked, code_locked,
                    votd_reference, votd_translation, votd_text) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Workshop group', '2810', '00000000-0000-0000-0000-0000000000b1',
   true, true, true, 'Ephesians 2:8-10', 'KJV', 'For by grace are ye saved'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Plain group', '5555', '00000000-0000-0000-0000-0000000000b1',
   false, false, false, null, null, null);
insert into group_members (group_id, user_id, display_name, is_co_leader) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000b1', 'Owner', false),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000c1', 'Co', true),
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', 'Member', false),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000b1', 'Owner', false),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000d1', 'Member', false);

-- the co-leader (an analyst) starts a meeting
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Alex')$$, 'a co-leader can start a discovery meeting');
select lives_ok($$update discovery_meetings set answers = '{"basics":"doing well"}'::jsonb, step = 2$$,
  'and write notes in it');
select is((select count(*) from discovery_meetings), 1::bigint, 'and sees it');

-- the owner also meets someone, and sees both
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Sam')$$, 'the owner can start a meeting');
select is((select count(*) from discovery_meetings), 2::bigint, 'the owner sees every meeting in the group');
select throws_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000bbbb', 'Nope')$$, null, null,
  'a meeting cannot be started in a group without the workshop');

-- the co-leader does not see the owner's meeting
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 1::bigint, 'a co-leader sees only their own meetings');

-- members and outsiders see nothing and cannot write
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 0::bigint, 'a plain member sees no meetings');
select throws_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Sneaky')$$, null, null, 'a plain member cannot start one');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 0::bigint, 'someone outside the group sees none');

-- the locks hold against the leader
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update groups set votd_reference = 'John 3:16' where id = '00000000-0000-0000-0000-00000000aaaa'$$,
  null, null, 'the leader cannot change a permanent verse');
select throws_ok($$select regenerate_group_code('00000000-0000-0000-0000-00000000aaaa')$$,
  null, null, 'the leader cannot change a permanent code');
select throws_ok($$update groups set workshop_enabled = true where id = '00000000-0000-0000-0000-00000000bbbb'$$,
  null, null, 'the leader cannot switch the workshop on for themselves');
select lives_ok($$update groups set votd_day = 4 where id = '00000000-0000-0000-0000-00000000bbbb'$$,
  'an ordinary group still sets its verse as before');

-- analysts: a co-leader makes an ordinary member an analyst
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select set_analyst('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', true)$$,
  'a co-leader can make a member an analyst');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Pat')$$, 'an analyst can start a discovery meeting');
select is((select count(*) from discovery_meetings), 1::bigint, 'and sees only their own meeting');
select throws_ok($$select set_analyst('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000e1', true)$$,
  null, null, 'an analyst cannot name other analysts');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 3::bigint, 'the owner sees the analyst''s meeting too');
select throws_ok($$select set_analyst('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000d1', true)$$,
  null, null, 'analysts cannot be named in a group without the workshop');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 1::bigint, 'a co-leader still does not see the analyst''s meeting');
select lives_ok($$select set_analyst('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000d1', false)$$,
  'a co-leader can take the analyst role away');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from discovery_meetings), 0::bigint, 'a former analyst no longer sees any meetings');
select throws_ok($$insert into discovery_meetings (group_id, participant_name)
  values ('00000000-0000-0000-0000-00000000aaaa', 'Again')$$, null, null, 'and cannot start one');

-- the site owner (the SQL editor, no signed-in user) can still change them
reset role;
select set_config('request.jwt.claims', '', true);
select lives_ok($$update groups set join_code = '2811' where id = '00000000-0000-0000-0000-00000000aaaa'$$,
  'the site owner can change a locked code from the SQL editor');

select * from finish();
rollback;
