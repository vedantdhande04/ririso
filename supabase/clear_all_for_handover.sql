-- Full wipe of test / study data before handing RIRISO to Riya.
-- Keeps: users (Riya) + subjects catalog.
-- Removes: topics, plans, sessions, notes, revisions, calendar, analytics cache.
--
-- Run in Supabase SQL editor once before handover.
-- ALSO clear the browser site data on the device she'll use (see comment at bottom).

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

commit;

-- Browser localStorage (most of the live app state today) — clear on the handoff device:
--   ririso:daily-plan
--   ririso:sessions
--   ririso:session-history
--   ririso:notes
--   ririso:revisions
--   ririso:calendar-events
--   ririso:analytics-cache
-- Easiest: DevTools → Application → Storage → Clear site data
-- (or open the app URL → site settings → clear data)
