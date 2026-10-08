-- 4 Rivers: tests for bulk leader invitations.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',    'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d1', 'Existing@Church.org', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'learner@test.local',  'authenticated', 'authenticated');
update profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a1';

-- a learner cannot use any of it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select admin_apply_leader_invites(array['x@y.org'], true)$$, null, null, 'a learner cannot send invitations');
select throws_ok($$select * from admin_leader_invites()$$, null, null, 'a learner cannot list invitations');

-- the admin invites one existing account, one new address, and one that is not an address at all
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((admin_apply_leader_invites(array['existing@church.org', 'Pastor@Church.org ', 'not an email', 'pastor@church.org'], true)::jsonb ->> 'total')::int,
  2, 'addresses are cleaned up and counted once');
select is((select count(*) from admin_leader_invites() where accepted_at is null), 1::bigint,
  'the new address waits for its owner to sign up');
reset role;
select is((select leader_status from profiles where user_id = '00000000-0000-0000-0000-0000000000d1'), 'approved',
  'someone who already has an account is approved on the spot');

-- when the new person signs up, they start as a leader
reset role;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'pastor@church.org', 'authenticated', 'authenticated');
select is((select leader_status from profiles where user_id = '00000000-0000-0000-0000-0000000000f1'), 'approved',
  'an invited person is a leader the moment they sign up');
select is((select count(*) from leader_invites where accepted_at is null), 0::bigint, 'and their invitation is marked used');

-- an uninvited person is still an ordinary learner
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f2', 'other@church.org', 'authenticated', 'authenticated');
select is((select leader_status from profiles where user_id = '00000000-0000-0000-0000-0000000000f2'), 'none',
  'someone who was not invited starts as a learner');

-- invitations without approval do not approve anyone
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select admin_apply_leader_invites(array['learner@test.local'], false);
reset role;
select is((select leader_status from profiles where user_id = '00000000-0000-0000-0000-0000000000e1'), 'none',
  'an invitation without approval leaves the person as a learner');
set local role authenticated;
select lives_ok($$select admin_cancel_leader_invite('learner@test.local')$$, 'an admin can cancel a waiting invitation');

reset role;
select * from finish();
rollback;
