-- Cross-device sync blob for the single-user app (no login).
-- Stores localStorage payloads so laptop + phone share one study day.

create table if not exists public.app_sync_state (
  user_id uuid primary key references public.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_sync_state enable row level security;

create policy "Allow all for app_sync_state"
  on public.app_sync_state
  for all
  using (true)
  with check (true);
