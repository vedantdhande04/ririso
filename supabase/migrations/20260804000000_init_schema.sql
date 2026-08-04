-- RIRISO initial schema (Supabase / Postgres)

create extension if not exists "pgcrypto";

-- Enums
create type public.shift_slot as enum ('morning', 'second', 'third', 'additional');
create type public.topic_status as enum ('not_started', 'in_progress', 'completed');
create type public.plan_status as enum ('draft', 'pledged', 'in_progress', 'completed', 'rest');
create type public.session_status as enum ('pending', 'active', 'paused', 'completed', 'skipped');
create type public.note_type as enum ('quick', 'doubt', 'fact', 'mistake', 'learned', 'remaining');
create type public.revision_type as enum ('same_day', 'next_day', 'weekly', 'fifteen_day', 'monthly');
create type public.calendar_event_type as enum (
  'same_day_revision',
  'next_day_revision',
  'weekly_revision',
  'fifteen_day_revision',
  'monthly_revision',
  'custom'
);

-- User (single primary user: Riya)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Riya',
  timezone text not null default 'Asia/Kolkata',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  shift_slot public.shift_slot not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  completion_percent numeric(5,2) not null default 0
    check (completion_percent >= 0 and completion_percent <= 100),
  status public.topic_status not null default 'not_started',
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, name)
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_date date not null,
  status public.plan_status not null default 'draft',
  pledged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references public.daily_plans (id) on delete cascade,
  shift_slot public.shift_slot not null,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  sort_order int not null default 0,
  status public.session_status not null default 'pending',
  is_none boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  planned_session_id uuid not null references public.planned_sessions (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  actual_study_ms bigint not null default 0,
  pause_ms bigint not null default 0,
  pause_count int not null default 0,
  completion_percent numeric(5,2)
    check (completion_percent is null or (completion_percent >= 0 and completion_percent <= 100)),
  created_at timestamptz not null default now()
);

create table public.pause_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_ms bigint,
  reason text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete cascade,
  note_type public.note_type not null default 'quick',
  body text not null,
  created_at timestamptz not null default now(),
  check (session_id is not null or topic_id is not null)
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  revision_type public.revision_type not null,
  scheduled_for date not null,
  completed_at timestamptz,
  topic_ids uuid[] not null default '{}',
  range_start date,
  range_end date,
  study_ms bigint not null default 0,
  reflection text,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_date date not null,
  event_type public.calendar_event_type not null,
  revision_id uuid references public.revisions (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.analytics_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

-- Indexes
create index topics_subject_id_idx on public.topics (subject_id);
create index topics_last_studied_at_idx on public.topics (last_studied_at desc nulls last);
create index daily_plans_plan_date_idx on public.daily_plans (plan_date);
create index planned_sessions_daily_plan_id_idx on public.planned_sessions (daily_plan_id);
create index sessions_planned_session_id_idx on public.sessions (planned_session_id);
create index pause_logs_session_id_idx on public.pause_logs (session_id);
create index notes_topic_id_idx on public.notes (topic_id);
create index notes_session_id_idx on public.notes (session_id);
create index revisions_scheduled_for_idx on public.revisions (scheduled_for);
create index calendar_events_event_date_idx on public.calendar_events (event_date);

-- Single-user app: open RLS for anon/authenticated (tighten later if needed)
alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.daily_plans enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.sessions enable row level security;
alter table public.pause_logs enable row level security;
alter table public.notes enable row level security;
alter table public.revisions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.analytics_cache enable row level security;

create policy "Allow all for users" on public.users for all using (true) with check (true);
create policy "Allow all for subjects" on public.subjects for all using (true) with check (true);
create policy "Allow all for topics" on public.topics for all using (true) with check (true);
create policy "Allow all for daily_plans" on public.daily_plans for all using (true) with check (true);
create policy "Allow all for planned_sessions" on public.planned_sessions for all using (true) with check (true);
create policy "Allow all for sessions" on public.sessions for all using (true) with check (true);
create policy "Allow all for pause_logs" on public.pause_logs for all using (true) with check (true);
create policy "Allow all for notes" on public.notes for all using (true) with check (true);
create policy "Allow all for revisions" on public.revisions for all using (true) with check (true);
create policy "Allow all for calendar_events" on public.calendar_events for all using (true) with check (true);
create policy "Allow all for analytics_cache" on public.analytics_cache for all using (true) with check (true);
