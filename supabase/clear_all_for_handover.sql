-- Full wipe of test / study data before handing RIRISO to Riya.
-- Keeps: users (Riya) + subjects catalog.
-- Removes: topics, plans, sessions, notes, revisions, calendar, analytics cache.
-- Resets device sync to an EMPTY snapshot (do NOT only delete the row —
-- a phone with old localStorage would re-upload and undo the wipe).
--
-- Run in Supabase SQL editor. Close the app on all devices first if you can.
-- THEN clear browser site data on every device (comment at bottom).

begin;

delete from public.calendar_events;
delete from public.revisions;
delete from public.notes;
delete from public.pause_logs;
delete from public.sessions;
delete from public.planned_sessions;
delete from public.daily_plans;
delete from public.analytics_cache;
delete from public.topics;

-- Empty sync blob with a fresh timestamp → devices clear local on next pull
insert into public.app_sync_state (user_id, payload, updated_at)
select id, '{}'::jsonb, now()
from public.users
where name = 'Riya'
on conflict (user_id) do update
set payload = '{}'::jsonb,
    updated_at = now();

commit;

-- Browser localStorage — clear on EVERY handoff device AFTER the SQL above:
-- Easiest: Chrome → site settings → Clear data / DevTools → Application → Clear site data
-- Keys involved: ririso:daily-plan, ririso:sessions, ririso:session-history,
--   ririso:notes, ririso:revisions, ririso:calendar-events,
--   ririso:analytics-cache, ririso:sync-meta
