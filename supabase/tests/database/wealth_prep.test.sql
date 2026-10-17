-- 4 Rivers: tests for Wealth Tools career prep (private to each person).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

create function public.rows_changed(sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'with changed as (' || sql || ' returning 1) select count(*) from changed' into n;
  return n;
end $$;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d3', 'c@test.local', 'authenticated', 'authenticated');
update profiles set wealth_status = 'approved' where user_id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select save_wealth_prep('{"journal":[]}'::jsonb)$$, null, null, 'without wealth tools a person cannot save prep');
select throws_ok($$select bump_wealth_stat('decks')$$, null, null, 'or count anything');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select save_wealth_prep('{"journal":[{"id":"x"}]}'::jsonb)$$, 'an approved person can save their prep');
select lives_ok($$select bump_wealth_stat('decks')$$, 'and count a deck');
select lives_ok($$select bump_wealth_stat('decks')$$, 'twice');
select throws_ok($$select bump_wealth_stat('anything')$$, null, null, 'only known counters can be bumped');
select lives_ok($$select save_wealth_prep('{"journal":[]}'::jsonb)$$, 'saving again');
select is((select (data #>> '{stats,decks}')::int from wealth_prep), 2, 'does not roll the counters back');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from wealth_prep), 0::bigint, 'another approved person sees none of it');

reset role;
select * from finish();
rollback;
