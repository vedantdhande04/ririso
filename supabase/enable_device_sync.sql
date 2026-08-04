-- Run once in Supabase SQL editor to enable laptop ↔ phone sync (no login).

create table if not exists public.app_sync_state (
  user_id uuid primary key references public.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_sync_state enable row level security;

drop policy if exists "Allow all for app_sync_state" on public.app_sync_state;
create policy "Allow all for app_sync_state"
  on public.app_sync_state
  for all
  using (true)
  with check (true);
