-- Optional: add session revision to Supabase enums (local app works without this).
-- Run in Supabase SQL editor if you want cloud rows for session revisions.

alter type public.revision_type add value if not exists 'session';

-- calendar_event_type may need a matching value depending on your schema
do $$
begin
  alter type public.calendar_event_type add value if not exists 'session_revision';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
