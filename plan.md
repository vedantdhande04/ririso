# RIRISO Implementation Plan

Derived from [PRD.md](PRD.md).

**Product:** Riya's MPSC Study Companion (RIRISO)  
**Platform:** Responsive website — comfortable on mobile and laptop  
**Flow:** Plan → Commit → Study → Reflect  
**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres) + Recharts + Lucide + Nunito/Quicksand

Use checkboxes to track progress. Mark a parent task done only when all its subtasks are done.

---

## Phase 0 — Foundation

### 0.1 Scaffold the website
- [x] Initialize Next.js App Router project with TypeScript
- [x] Add Tailwind CSS and configure content paths
- [x] Add ESLint and Prettier with shared config
- [x] Set correct viewport meta for mobile + laptop
- [x] Add `.env.example` for Supabase URL, anon key, and app settings
- [x] Add `.gitignore` for `.env`, `node_modules`, `.next`
- [x] Verify `npm run dev` starts cleanly

### 0.2 Project structure
- [x] Create `app/` routes skeleton (`/`, `/session`, `/calendar`, `/analytics`, `/topics`)
- [x] Create `components/` folders (`ui`, `planning`, `session`, `dashboard`, `calendar`, `analytics`, `notes`)
- [x] Create `lib/` for supabase client, date helpers, analytics helpers, constants
- [x] Create `supabase/` for SQL migrations and seed
- [x] Create `public/` for doodles/illustrations assets
- [x] Document folder conventions in a short README section

### 0.3 Responsive baseline
- [x] Define Tailwind breakpoints used in the app (`sm`, `md`, `lg`)
- [x] Add a max-width page shell that centers content on laptop
- [x] Ensure body never causes horizontal overflow on narrow phones
- [x] Set minimum touch target size guidance (44px) in UI primitives
- [x] Smoke-check home shell at ~390px and ~1280px widths

---

## Phase 1 — Design System

### 1.1 Design tokens
- [x] Define CSS variables for warm white / ivory / cream backgrounds
- [x] Define pastel green (complete / active / success)
- [x] Define pastel pink (buttons / cards / empty states)
- [x] Define pastel yellow (goals / highlights / reminders)
- [x] Define pastel lavender (analytics accents, sparingly)
- [x] Avoid pure black; use soft charcoal for text
- [x] Document token usage in one place (`globals.css` or `tokens.css`)

### 1.2 Typography
- [x] Load rounded font(s): Nunito and/or Quicksand
- [x] Set friendly header scale for mobile
- [x] Set readable body scale for mobile
- [x] Scale typography up gently on laptop (`md:` / `lg:`)
- [x] Define greeting / quote / caption text styles

### 1.3 Core UI primitives
- [x] Button (large, rounded 20–28px, hover scale, press bounce)
- [x] Selected-state button (pastel fill + darker outline)
- [x] Card (paper-like, 24px radius, soft shadow, whitespace)
- [x] Input / textarea (18px radius)
- [x] Popup / modal shell (30px radius, soft scale-in)
- [x] Progress ring component
- [x] Soft capsule progress (growth metaphor, not harsh bars)
- [x] Icon wrapper using Lucide rounded style

### 1.4 Motion and feedback
- [x] Button press bounce under 300ms
- [x] Card gentle enter animation
- [x] Progress fill / bloom transition
- [x] Popup soft scale animation
- [x] Tiny sparkle feedback utility for saves
- [x] Day-complete confetti hook (wired later)
- [x] No spinning loaders; use soft fade/skeleton if needed

### 1.5 Illustrations and empty states
- [x] Add small doodle asset set (flowers, books, mug, stars, etc.)
- [x] Empty-state component with supportive copy + illustration
- [x] Supportive notification copy helpers (no guilt language)
- [x] Personalization helper that inserts “Riya” in greetings

### 1.6 Responsive shell
- [x] App layout with cozy background (not flat single color only)
- [x] Mobile bottom or top nav that does not crowd content
- [x] Laptop side or top nav with more breathing room
- [x] Full-screen modal pattern for mobile planning
- [x] Centered dialog pattern for laptop planning
- [x] Safe-area padding for notched phones

---

## Phase 2 — Data Model

### 2.1 Supabase setup
- [x] Install `@supabase/supabase-js` and wire env via `.env.example`
- [x] Create / link a Supabase project and add URL + anon key to `.env.local`
- [x] Create browser + server Supabase clients in `lib/supabase`
- [x] Add SQL migrations under `supabase/migrations`
- [x] Apply first schema migration + `seed.sql` in the Supabase SQL editor

### 2.2 Schema models
- [x] `User` (name default Riya, preferences, timezone)
- [x] `Subject` (name, shift slot, order)
- [x] `Topic` (subjectId, name, completionPercent, status, lastStudiedAt)
- [x] `DailyPlan` (date, pledgedAt, completedAt, status)
- [x] `PlannedSession` (dailyPlanId, shift, subjectId, topicId, order, status)
- [x] `Session` (plannedSessionId, start, end, actualStudyMs, pauseMs, pauseCount, completionPercent)
- [x] `PauseLog` (sessionId, start, end, durationMs, reason)
- [x] `Note` (sessionId/topicId, type: quick|doubt|fact|mistake, body)
- [x] `Revision` (type, scheduledFor, completedAt, related topic ids / date range)
- [x] `CalendarEvent` (date, type, revisionId, label)
- [x] `AnalyticsCache` (key, payload JSON, computedAt)
- [x] Relations and indexes for date, subject, topic lookups

### 2.3 Seed data
- [x] Seed user “Riya”
- [x] Seed morning-shift subjects: Politics, Economics, English, Marathi
- [x] Seed second-shift subjects: Maths
- [x] Seed third-shift subjects: History, Geography
- [x] Seed additional-shift subjects: General Science, Current Affairs, Reasoning
- [x] Start with **zero topics** (Riya creates them via “New topic”)
- [x] Verify seed is idempotent or clear-and-reseed safely

### 2.4 Domain services
- [x] Date helpers for “study day” boundary after 6:00 AM
- [x] Service: get or create today’s plan
- [x] Service: has completed mandatory planning today
- [x] Service: create revision events from completed sessions
- [x] Service: compute streak from daily completion history

---

## Phase 3 — Daily Planning Gate

### 3.1 Mandatory planning gate
- [x] Detect local time and study-day after 6:00 AM
- [x] Block all main screens until today’s plan is pledged
- [x] Popup cannot be dismissed without completing planning
- [x] Persist plan draft while selecting shifts/topics
- [x] Mobile: full-viewport planning experience
- [x] Laptop: comfortable modal or dedicated planning page

### 3.2 Shift subject pickers
- [x] Morning shift picker: Politics / Economics / English / Marathi / None
- [x] Second shift picker: Maths / None
- [x] Third shift picker: History / Geography / None
- [x] Additional shift picker: General Science / Current Affairs / Reasoning / None
- [x] Large rounded single-select buttons
- [x] Instant selected highlight feedback
- [x] Allow “None” without breaking later flow
- [x] Stack shifts vertically on mobile; denser grouping on laptop

### 3.3 Topic selection
- [x] Expand topic selector after subject chosen
- [x] Show **New topic** action at the top of the list
- [x] Create topic in Supabase and auto-select it
- [x] Show already-created topics below (name, completion %, status, last studied)
- [x] Sort existing topics: recently studied → incomplete → completed
- [x] Completed topics styled in pastel green
- [x] Persist selected topic per planned session
- [x] Topic list scrollable on mobile without trapping page scroll badly
- [x] Start with zero topics in the system

### 3.4 Save plan
- [x] Validate at least one non-None session or allow intentional rest day (define rule)
- [x] Create `DailyPlan` + `PlannedSession` rows
- [x] Navigate to commitment screen after save

---

## Phase 4 — Commitment and Study Sessions

### 4.1 Daily commitment screen
- [x] Large centered pledge button
- [x] Rotate pledge copy variants (“I Pledge…”, “I Will Finish…”, “No Excuses…”)
- [x] On click: set `pledgedAt`, start Session 1 timer immediately
- [x] Comfortable full-width CTA on mobile; centered large CTA on laptop

### 4.2 Active session timer
- [x] Auto-start timer when session begins
- [x] Display large timer
- [x] Display current subject, topic, session number
- [x] Display session progress indicator
- [x] Controls: Pause, Resume, Finish Session
- [x] Rotate tiny encouraging messages without interrupting focus
- [x] Keep timer readable and tappable on mobile
- [x] Keep calm spacious layout on laptop

### 4.3 Pause flow
- [x] On pause: record start timestamp
- [x] On resume/finish pause: record end + duration
- [x] Optional reason: Break / Phone Call / Lunch / Washroom / Custom
- [x] Increment session pause count and pause time
- [x] Persist each `PauseLog`

### 4.4 Finish session
- [x] Show finish popup
- [x] Ask “How much of today’s topic was completed?”
- [x] Slider 1% → 100% with live percentage
- [x] Optional notes: “What did you learn?” / “What remains?”
- [x] Save session end, actual study time, completion %, notes
- [x] Update topic completion % and last studied date
- [x] Mark planned session completed
- [x] Advance to next pending planned session or same-day revision
- [x] Slider and save actions usable with thumb on mobile

### 4.5 Multi-session day flow
- [x] Queue remaining planned sessions in order
- [x] Allow resume of in-progress session from home
- [x] Handle skipped session state
- [x] When all study sessions done, unlock same-day revision

---

## Phase 5 — Home Dashboard

### 5.1 Today status at a glance
- [x] Personalized greeting (“Good Morning, Riya…”)
- [x] Current session card with large Start / Resume
- [x] Remaining sessions summary
- [x] Daily progress ring
- [x] Study streak
- [x] Hours studied today
- [x] Remaining planned hours
- [x] Motivational quote
- [x] Upcoming revision teaser
- [x] Calendar alerts teaser

### 5.2 Vertical timeline
- [x] Render today’s planned sessions as vertical timeline
- [x] Show time labels (e.g. 8 AM, 10 AM, 2 PM, 6 PM revision)
- [x] Highlight current session
- [x] Completed sessions in pastel green
- [x] Upcoming sessions in soft gray
- [x] Include Daily Revision node after study sessions
- [x] Timeline readable in one column on mobile
- [x] Timeline can use wider spacing on laptop

### 5.3 Dashboard responsive composition
- [x] Mobile: single-column diary-like stack (greeting → CTA → timeline → stats)
- [x] Laptop: primary timeline/CTA composition without dashboard clutter overload
- [x] Keep first viewport focused (brand/greeting, one CTA, today’s story)
- [x] Avoid packing analytics widgets onto home

---

## Phase 6 — Notes

### 6.1 Session notes capture
- [x] Quick Notes field during/after session
- [x] Doubts field
- [x] Important Facts field
- [x] Mistakes field
- [x] Save notes linked to session and topic
- [x] Soft sparkle feedback on save

### 6.2 Notes in revisions
- [x] Fetch related notes when opening a revision
- [x] Group notes by topic
- [x] Show yesterday’s notes in next-day revision
- [x] Keep notes UI compact on mobile

---

## Phase 7 — Calendar and Revisions

### 7.1 Revision auto-scheduling
- [x] Create Same Day Revision after all study sessions
- [x] Create Next Day Revision for next study day
- [x] Create Weekly Revision for every Sunday
- [x] Create 15 Day Revision every 15th
- [x] Create Monthly Revision on last day of month
- [x] Write corresponding `CalendarEvent` rows

### 7.2 Same-day revision
- [x] Appear after all study sessions complete
- [x] Include timer, pause, finish
- [x] Capture reflection notes
- [x] Capture topics revised
- [x] Mark completion for analytics

### 7.3 Next-day revision
- [x] Auto-generate from previous day’s topics
- [x] “Start Yesterday’s Revision” button
- [x] Show topics + yesterday’s notes
- [x] Timer + completion record

### 7.4 Weekly / 15-day / monthly revision
- [x] Sunday weekly revision collecting week’s topics
- [x] 15-day revision collecting topics since previous 15-day event
- [x] Monthly checklist + summary + reflection
- [x] Each revision stores time and completion

### 7.5 Calendar UI
- [x] Planner-style month calendar
- [x] Soft sticker icons for revision types
- [x] Day detail panel/sheet for selected date
- [x] Mobile: month grid + bottom sheet detail
- [x] Laptop: month grid + side detail panel
- [x] No tiny untappable day cells on phones

---

## Phase 8 — Analytics

### 8.1 Data capture completeness
- [x] Persist session start/end
- [x] Persist actual study time and pause time
- [x] Persist pause count and reasons
- [x] Persist topics and completion %
- [x] Persist notes and revision time
- [x] Persist daily plans and skipped sessions
- [x] Ensure every interaction needed for charts is queryable

### 8.2 Overview metrics
- [x] Today’s hours
- [x] This week / month / lifetime hours
- [x] Current streak / longest streak
- [x] Average session / average break
- [x] Total topics completed
- [x] Total hours
- [x] Revision completion %

### 8.3 Heatmap and day expand
- [x] GitHub-style study heatmap in pastel greens
- [x] Color intensity by hours studied
- [x] Click/tap day to expand
- [x] Expanded day shows morning / afternoon / evening / revision blocks
- [x] Vertical session visualization with study (green) vs pause (gray)

### 8.4 Charts and deeper analytics
- [x] Timeline chart (minute-accurate daily timeline, zoom on laptop)
- [x] Study trend line (7 / 30 / 60 / 90 / all)
- [x] Subject analytics (hours, completion, averages, most/least studied)
- [x] Topic analytics (started, %, time, sessions, days active, completion date)
- [x] Productivity stats (best day/week/month, longest/deepest session, avg start/end/break)
- [x] Focus analytics (study vs pause ratio)
- [x] Time distribution pie by subject
- [x] Consistency stats (streaks, missed/recovery days, perfect weeks/months)
- [x] Planning accuracy (planned vs completed vs skipped, planned vs actual hours)
- [x] Revision analytics by type + missed + time
- [x] Reflection analytics (word cloud, common struggles, postponed subjects, unfinished topics)
- [x] Study clock (24h circular month patterns)
- [x] Session replay for a selected day

### 8.5 Analytics responsive layout
- [x] Mobile: stacked sections, horizontal scroll only where intentional
- [x] Laptop: multi-column overview without corporate dashboard feel
- [x] Charts use responsive containers
- [x] Keep soft pastel / rounded chart styling
- [x] Avoid overwhelming first load; progressive disclosure of deep sections

### 8.6 Analytics cache
- [x] Compute expensive aggregates into `AnalyticsCache`
- [x] Invalidate or recompute on new session/revision save
- [x] Fallback to live compute if cache missing

---

## Phase 9 — Polish and Responsive QA

### 9.1 Copy and personalization
- [x] Use Riya’s name in greetings and key moments
- [x] Replace guilt copy with supportive alternatives
- [x] Empty states use journal language
- [x] Notification strings use soft coach tone

### 9.2 Micro-interactions
- [x] Checkbox fills with flower motif
- [x] Progress ring bloom
- [x] Completed card slides into completed section
- [x] Topic completion smooth animation
- [x] Confetti only when entire day’s study plan completes
- [x] Keep animations under 300ms except confetti

### 9.3 End-to-end day path
- [x] Morning open → mandatory plan → topics → pledge → session 1
- [x] Pause/resume → finish → next session(s)
- [x] Same-day revision → reflection → analytics update
- [x] Next day gate + yesterday revision entry point
- [x] Sunday weekly revision path
- [x] Month-end monthly revision path

### 9.4 Responsive QA checklist
- [x] Planning popup usable on phone and laptop
- [x] Topic lists scroll and select cleanly on both
- [x] Timer controls easy on touch and mouse
- [x] Finish slider usable on touch
- [x] Home timeline readable on both
- [x] Calendar days tappable on phone; detail readable on laptop
- [x] Analytics charts readable on phone; spacious on laptop
- [x] No horizontal page scroll at 360–430px widths
- [x] Comfortable layout at 1280–1440px laptop widths
- [x] Text does not overflow or collide with doodles

### 9.5 Quality bar
- [x] No blocked navigation before planning after 6 AM
- [x] Session times accurate across pause/resume
- [x] Topic % updates correctly
- [x] Revisions auto-create on expected rules
- [x] Analytics numbers match stored session data
- [x] Soft cozy visual language consistent across all screens

---

## Deferred / Out of Scope (not MVP)

From PRD non-goals and future features — do not implement in this plan’s MVP checkboxes:

- [ ] Note-taking software / rich notebook
- [ ] Flashcards
- [ ] AI tutor
- [ ] Question bank
- [ ] Social study platform
- [ ] Gamified reward system / achievements
- [ ] Native mobile apps
- [ ] Smart schedule recommendations
- [ ] AI-generated daily reflections
- [ ] Burnout detection
- [ ] Adaptive revision scheduling
- [ ] Predictive exam readiness score
- [ ] Estimated syllabus completion date
- [ ] Subject-wise confidence scoring
- [ ] Voice-dictated reflections
- [ ] PDF export
- [ ] Offline mode with sync
- [ ] Data backup/restore UI
- [ ] Custom study patterns beyond fixed MPSC schedule
- [ ] Accountability partner sharing
- [ ] OS widgets

---

## Suggested build order

1. Phase 0 Foundation  
2. Phase 1 Design System  
3. Phase 2 Data Model  
4. Phase 3 Planning Gate  
5. Phase 4 Commitment + Sessions  
6. Phase 5 Home Dashboard  
7. Phase 6 Notes  
8. Phase 7 Calendar + Revisions  
9. Phase 8 Analytics  
10. Phase 9 Polish + Responsive QA  

Success metrics from the PRD (planning completion, session start/complete rates, revision completion, streak/focus trends) should be measurable from Phase 8 data once the daily loop is live.
