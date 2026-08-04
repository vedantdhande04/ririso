-- Idempotent seed for RIRISO (run in Supabase SQL editor after migration)
-- Subjects only — topics start empty; Riya creates them while planning.

insert into public.users (name, timezone)
select 'Riya', 'Asia/Kolkata'
where not exists (select 1 from public.users where name = 'Riya');

insert into public.subjects (name, shift_slot, sort_order)
values
  ('Politics', 'morning', 1),
  ('Economics', 'morning', 2),
  ('English', 'morning', 3),
  ('Marathi', 'morning', 4),
  ('Maths', 'second', 1),
  ('History', 'third', 1),
  ('Geography', 'third', 2),
  ('General Science', 'additional', 1),
  ('Current Affairs', 'additional', 2),
  ('Reasoning', 'additional', 3)
on conflict (name) do nothing;

-- Clear any previously seeded starter topics (safe if you already ran the old seed)
delete from public.topics;
