# Fix Plan — Flexible Sessions & Home UX

Based on feedback from Riya (end user). Implement after this plan is approved.

**Goals**
- Any study session (and revision) can be started / paused / resumed independently, in any order
- No clock-time labels or forced sequence
- No 1.5h session cap; focus % uses real study vs break time only
- Extra sessions can be added mid-day from home
- Home reflects revision completion correctly
- Situational, randomized greeting lines under the time-of-day greeting

**Out of scope for this pass**
- Changing Supabase schema (unless a small additive field is required)
- Full analytics redesign beyond removing 1.5h assumptions
- Native notifications

---

## Phase A — Session model: independent blocks (no order / no clock times)

### A.1 Remove forced queue / sequential flow
- [x] Stop treating sessions as a strict `currentIndex` pipeline that auto-advances to the “next” session
- [x] Allow multiple planned sessions to exist as independent blocks with their own status: `pending` | `active` | `paused` | `completed` | `skipped`
- [x] Support pausing morning session, finishing other sessions, then resuming morning later
- [x] Keep at most one `active` timer at a time (resume/start another requires pausing the current active one, with a clear prompt)
- [x] Update `lib/session-storage.ts` APIs: `startSession(id)`, `pauseSession(id)`, `resumeSession(id)`, `finishSession(id)`, `skipSession(id)`
- [x] Preserve pause logs, study ms, and notes per session

### A.2 Remove time-of-day labels from home
- [x] Remove timeline time labels (`8 AM`, `10 AM`, `2 PM`, `6 PM`, etc.) from `TodayTimeline` / home
- [x] Remove any UX copy that implies sessions must happen in morning→second→third order
- [x] Keep shift names only as soft labels on blocks if useful (Morning / Second / …), not as schedule times

### A.3 Replace timeline with session blocks on home
- [x] Replace vertical timeline UI with a **Session blocks** list/grid on home
- [x] Each study block shows: subject, topic, status chip, elapsed today, primary action
- [x] Block actions by status:
  - pending → **Start**
  - active → **Open timer** / **Pause**
  - paused → **Resume**
  - completed → Completed (no start)
  - skipped → optional **Restart** or leave as skipped
- [x] Add a **Daily Revision** block (always visible after pledge / when revision exists)
- [x] Revision block actions: Start / Resume / Completed based on revision state
- [x] Wire block Start/Resume to `/session?id=…` (or `/revision?type=…`) instead of a single global queue pointer
- [x] Mobile: stacked blocks; laptop: comfortable multi-column or wider cards

### A.4 Session page supports opening any block
- [x] `/session` accepts a session id (query or path)
- [x] Loading `/session` without id opens the current active/paused session if any, else shows a picker / returns home with message
- [x] Remove auto-redirect that assumes “all done → force revision” as the only path (revision is its own block)
- [x] Confetti only when **all planned study blocks + same-day revision** are complete (or when study blocks complete — decide: prefer study blocks complete; revision optional for confetti? **Decision: confetti when all study blocks completed; soft sparkle when revision completes**)

---

## Phase B — Remove 1.5h limits; fix focus / progress math

### B.1 Remove planned-hours / 1.5h assumptions from home
- [x] Delete `PLANNED_MS_PER_SESSION` (90 minutes) from `HomeDashboard`
- [x] Remove or replace “Remaining planned hours” (no fake remaining based on 1.5h)
- [x] Daily progress ring = completed study blocks / total study blocks (not time-based)
- [x] Show real **Hours studied today** from sum of session study ms only

### B.2 Analytics focus % from actual session duration
- [x] For each session: `totalMs = studyMs + pauseMs`
- [x] `studyPct = studyMs / totalMs`, `pausePct = pauseMs / totalMs` (0 if totalMs is 0)
- [x] Aggregate focus the same way across sessions (sum study / sum (study+pause))
- [x] Remove `plannedMs = planned * 90 * 60 * 1000` from `lib/analytics.ts`
- [x] Planning accuracy: compare planned **session counts** completed vs skipped; drop fake planned-hours delta (or show actual hours only)
- [x] Recheck deep-focus / averages so they never assume a 1.5h ceiling
- [x] Invalidate analytics cache after these formula changes

### B.3 Timer correctness audit
- [x] Verify pause freezes study elapsed and accumulates pause duration
- [x] Verify resume continues study from accumulated study ms (no double-count)
- [x] Verify finish captures final study segment correctly when finishing from active or paused
- [x] Verify switching away from tab / remounting page restores correct live elapsed from storage
- [x] Verify independent sessions do not share one timer state
- [ ] Add a short manual test checklist in this file (below) and run it

---

## Phase C — Add extra session from home

### C.1 Home “Add extra session” button
- [x] Add a clear button on home near session blocks: **Add extra session**
- [x] Only show after daily planning/pledge (or always after 6AM plan exists — **Decision: show after today’s plan is pledged**)
- [x] Mobile-friendly full-width placement

### C.2 Extra-session popup flow
- [x] Open modal (locked until cancel/save) with:
  - Shift slot (optional soft choice: morning / second / third / additional / custom “extra”)
  - Subject picker (same subject lists as planning, including None disallowed for extras)
  - Topic selector with **New topic** on top + existing topics below
- [x] On save: append a new independent session block to today’s plan + session storage
- [x] New block appears immediately on home as `pending`
- [x] Persist in local plan storage; sync to Supabase planned_sessions when wiring is available
- [x] Cancel closes without changing state

---

## Phase D — Revision completion on home

### D.1 Show revision completed regardless of clock time
- [x] Home revision block reads `getSameDayRevision()` and uses `completedAt` (not time-of-day)
- [x] If revision finished early (before 6 PM or any time), status shows **Completed**
- [x] Remove any UI that waits for “6 PM” or timeline position to mark revision done
- [x] Ensure completing revision invalidates home state (re-read storage on focus / after navigation back)
- [x] Fix CTA logic so completed revision is not offered again as “Start same-day revision”
- [x] If all study blocks + revision complete, home CTA becomes a soft “Day complete” / analytics nudge

### D.2 Revision availability without finishing every study block first
- [x] Allow starting same-day revision anytime after pledge (user request: start any session including revision anytime)
- [x] Keep auto-create of revision records when first needed (on pledge or first open), not only after all study sessions finish
- [x] Still auto-create next-day / weekly / etc. on sensible triggers (end of day or when study blocks complete — **Decision: create same-day revision at pledge time so the block exists early**)

---

## Phase E — Situational greeting lines

### E.1 Situation detector
- [x] Derive home “moment” from state, e.g.:
  - `not_planned` / `ready_to_pledge`
  - `no_sessions_started`
  - `first_session_done`
  - `mid_day_progress`
  - `one_session_left`
  - `all_study_done_revision_left`
  - `revision_in_progress`
  - `day_complete`
  - `rest_day`
- [x] Recompute on home mount and when returning from session/revision

### E.2 Copy bank + random pick
- [x] Expand `lib/copy.ts` with arrays of lines per situation (many variants each)
- [x] Include Riya’s name naturally in several lines
- [x] Examples to cover:
  - “Good job on completing the first session of the day!!”
  - “Now only revision is left, Riya — let’s do this!”
  - mid-progress encouragement, pause/resume friendly lines, day-complete warmth
- [x] Pick **one random line per situation per home visit** (stable for that mount; new random on refresh/navigation back)
- [x] Replace hard-coded `supportive.readyFirst` under the greeting on home
- [x] Keep time-of-day greeting (`Good morning/afternoon/evening, Riya`) unchanged above

---

## Phase F — Cleanup, QA, plan tracking

### F.1 Code cleanup
- [x] Remove dead timeline components or repurpose into `SessionBlocks`
- [x] Remove unused 1.5h constants and remaining-hours UI
- [x] Update `plan.md` notes only if needed (optional); keep this file as source of truth for this fix pass

### F.2 Manual QA checklist
- [ ] Plan day with 2+ subjects → pledge → home shows blocks (no clock times)
- [ ] Start session B while A never started → works
- [ ] Pause A → finish B → resume A → finish A → timers look correct
- [ ] Study 10+ minutes with pauses → focus % ≈ study/(study+pause), not vs 1.5h
- [ ] Add extra session from home → appears as new block → can start independently
- [ ] Start revision before all study blocks done → allowed
- [ ] Complete revision early → home shows revision Completed
- [ ] Greeting line changes after first session complete / when only revision left / when day complete
- [ ] Mobile + laptop layouts still comfortable

### F.3 Ship
- [ ] Commit with a clear message
- [ ] Push to GitHub when asked

---

## Suggested build order

1. Phase A (session independence + home blocks)  
2. Phase B (remove 1.5h + timer audit)  
3. Phase D (revision early + completion display) — pairs with A revision block  
4. Phase C (add extra session)  
5. Phase E (situational copy)  
6. Phase F (QA + ship)

## Key files likely touched

- `components/dashboard/HomeDashboard.tsx`
- `components/dashboard/TodayTimeline.tsx` → replace with `SessionBlocks.tsx`
- `lib/session-storage.ts`
- `components/session/SessionTimer.tsx`
- `lib/revision-storage.ts`
- `components/session/RevisionSession.tsx`
- `lib/analytics.ts`
- `lib/copy.ts`
- `components/planning/*` (reuse for extra-session modal)
