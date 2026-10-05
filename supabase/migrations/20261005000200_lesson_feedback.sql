-- 4 Rivers — migration 021: lesson feedback
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A signed-in learner can say whether a lesson helped, with an optional note.
-- One answer per person per lesson (they can change it). Learners see only
-- their own answer; admins see everyone's, without names, to improve the text.

create table if not exists lesson_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('introduction', '1', '2', '3', '4')),
  module_index int not null check (module_index between 0 and 30),
  helpful boolean not null,
  note text check (note is null or char_length(note) <= 600),
  updated_at timestamptz not null default now(),
  primary key (user_id, section, module_index)
);

alter table lesson_feedback enable row level security;

drop policy if exists "Read your own lesson feedback" on lesson_feedback;
create policy "Read your own lesson feedback" on lesson_feedback
  for select using (user_id = auth.uid());

drop policy if exists "Admins read all lesson feedback" on lesson_feedback;
create policy "Admins read all lesson feedback" on lesson_feedback
  for select using (is_admin());

drop policy if exists "Give lesson feedback" on lesson_feedback;
create policy "Give lesson feedback" on lesson_feedback
  for insert with check (user_id = auth.uid());

drop policy if exists "Change your lesson feedback" on lesson_feedback;
create policy "Change your lesson feedback" on lesson_feedback
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Remove your lesson feedback" on lesson_feedback;
create policy "Remove your lesson feedback" on lesson_feedback
  for delete using (user_id = auth.uid());
