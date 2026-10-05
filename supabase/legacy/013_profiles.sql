-- 4 Rivers — migration 013: profile pictures and sign-up names
-- Run once in the Supabase SQL editor. Safe to re-run.
--
--   * profiles.avatar holds either "icon:<name>" (one of the sketched icons)
--     or a small JPEG as a data URL (the app shrinks every upload to about
--     160 px first). Nothing else is accepted.
--   * New accounts now save the preferred name AND full name given at sign-up.
--   * Group rosters include each member's picture, so the chat can show it.

alter table profiles
  add column if not exists avatar text
    check (
      avatar is null
      or avatar ~ '^icon:[a-z]{2,20}$'
      or (avatar like 'data:image/jpeg;base64,%' and char_length(avatar) <= 60000)
    );

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, full_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  return new;
end;
$$;

create or replace function group_overview(p_group uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not is_group_member(p_group) then
    raise exception 'not a member';
  end if;
  select json_build_object(
    'members', coalesce((
      select json_agg(json_build_object(
        'user_id', m.user_id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), nullif(m.display_name, ''), 'Member'),
        'is_leader', (m.user_id = g.leader_id),
        'joined_at', m.joined_at,
        'avatar', p.avatar
      ) order by (m.user_id = g.leader_id) desc, m.joined_at)
      from group_members m
      join groups g on g.id = m.group_id
      left join profiles p on p.user_id = m.user_id
      where m.group_id = p_group
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;
