# RIRISO

Riya's MPSC Study Companion — a cozy responsive website for **Plan → Commit → Study → Reflect**.

See [PRD.md](PRD.md) for product requirements and [plan.md](plan.md) for the implementation checklist.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres)
- Recharts (analytics), Lucide icons, Nunito / Quicksand

## Getting started

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Folder conventions

| Path | Purpose |
|------|---------|
| `app/` | Routes (`/`, `/session`, `/calendar`, `/analytics`, `/topics`) |
| `components/ui` | Shared primitives (Button, Card, Modal, …) |
| `components/planning` | Daily planning gate UI |
| `components/session` | Timer, pause, finish flows |
| `components/dashboard` | Home timeline and status |
| `components/calendar` | Planner calendar |
| `components/analytics` | Charts and insights |
| `components/notes` | Session notes |
| `components/layout` | Page shell and navigation |
| `lib/` | Supabase clients, date helpers, constants, copy |
| `supabase/migrations` | SQL schema migrations |
| `supabase/seed.sql` | Seed data for subjects/topics |
| `public/doodles` | Soft illustration assets |

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run format` — Prettier write
