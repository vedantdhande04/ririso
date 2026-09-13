-- Allow same subject name on different shifts (e.g. English in morning + additional).
-- Then seed Environment / English / Marathi for the additional shift.

alter table public.subjects drop constraint if exists subjects_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_name_shift_slot_key'
  ) then
    alter table public.subjects
      add constraint subjects_name_shift_slot_key unique (name, shift_slot);
  end if;
end $$;

insert into public.subjects (name, shift_slot, sort_order)
values
  ('Environment', 'additional', 4),
  ('English', 'additional', 5),
  ('Marathi', 'additional', 6)
on conflict (name, shift_slot) do nothing;
