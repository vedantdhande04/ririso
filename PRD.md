# Product Requirements Document (PRD)

# Project

**Riya's MPSC Study Companion - RIRISO**

Version: 1.0

Platform: Responsive Web App (Desktop First, Mobile Optimized)

---

# 1. Vision

Build a deeply personalized study companion that transforms studying from a daily decision into a daily commitment.

Unlike traditional study trackers that simply record completed tasks, this application should create accountability before studying begins, accurately measure how time is spent, automatically schedule revisions, and provide meaningful analytics that encourage consistency rather than guilt.

The app should feel like a quiet coach rather than a productivity tool.

---

# 2. Problem Statement

Riya is preparing for the MPSC ASO examination.

The exam is approximately 8 to 10 months away.

Her challenges include:

* Procrastination before beginning study sessions
* Lack of structured daily planning
* Difficulty remembering where she previously stopped studying
* No historical record of actual study effort
* No revision scheduling system
* No reflection mechanism
* Inability to identify patterns in productivity

Current tools like Notion, Google Calendar, or generic study timers solve individual problems but fail to create one unified workflow.

---

# 3. Goals

## Primary Goals

* Eliminate daily decision fatigue
* Increase consistency
* Track actual study effort
* Automatically manage revisions
* Build accountability
* Make progress visible

## Secondary Goals

* Reduce planning time
* Encourage completion of sessions
* Identify productive habits
* Create motivation through data visualization

---

# 4. Non Goals

The application is NOT intended to become:

* Note taking software
* Flashcard application
* AI tutor
* Question bank
* Social study platform
* Gamified reward system

The focus remains:

**Planning → Studying → Reflecting**

---

# 5. Target User

## Primary User

Riya

Preparing for:

MPSC Assistant Section Officer (ASO)

Study Duration:

8-10 months

Study Pattern:

Fixed subject schedule every day

Studies in multiple dedicated shifts

Needs accountability more than reminders

---

# 6. Core Philosophy

Every study day follows four stages.

```
Plan

↓

Commit

↓

Study

↓

Reflect
```

The app should never overwhelm.

Only show what is necessary for the current moment.

---

# 7. User Flow

## Morning

Open app

↓

Mandatory Planning Popup

↓

Select today's subjects

↓

Select topics

↓

Pledge

↓

Session begins

↓

Complete Session

↓

Update Progress

↓

Next Session

↓

Daily Revision

↓

Reflection

↓

Analytics Updated

---

# 8. Daily Planning Experience

## Trigger

Every day

After 6:00 AM

Before any other screen becomes accessible.

Popup cannot be closed.

Planning is mandatory.

---

## Planning Questions

### Morning Shift

Choose one:

Politics

Economics

English

Marathi

None

---

### Second Shift

Choose one:

Maths

None

---

### Third Shift

Choose one:

History

Geography

None

---

### Additional Shift

Choose one:

General Science

Current Affairs

Reasoning

None

---

Selection style:

Large rounded buttons

Single selection only

Selected option highlighted

Instant feedback

---

# 9. Topic Selection

Once a subject is selected

Topic selector expands.

Each subject contains:

Topic Name

Completion %

Status

Last Studied Date

Example

```
Inflation........................65%

GDP...............................40%

Banking..........................100% ✓

Monetary Policy...............15%
```

Ordering:

Recently studied

↓

Incomplete

↓

Completed

Completed topics shown in green.

---

# 10. Daily Commitment Screen

Large centered button.

Examples

"I Pledge To Complete Today's Target"

or

"I Will Finish What I Planned Today"

or

"No Excuses. Let's Begin."

Clicking the button immediately starts Session 1 timer.

---

# 11. Study Session

Timer starts automatically.

Display:

Large timer

Current Subject

Current Topic

Current Session

Progress

Controls

Pause

Resume

Finish Session

---

# 12. Pause

When paused

Record

Start

End

Duration

Reason (optional)

Example

Break

Phone Call

Lunch

Washroom

Custom

---

# 13. Finish Session

On clicking Finish

Popup appears.

Question

How much of today's topic was completed?

Slider

1%

↓

100%

Live percentage display.

Optional notes

"What did you learn?"

"What remains?"

Save.

---

# 14. Home Dashboard

Should immediately communicate today's status.

Contains

Current Session

Large Start/Resume Button

Remaining Sessions

Timeline

Upcoming Revision

Calendar Alerts

Daily Progress Ring

Motivational Quote

Study Streak

Hours Studied Today

Remaining Planned Hours

---

# 15. Timeline Design

Visual vertical timeline.

```
8 AM

|

Economics

Completed

|

10 AM

|

Maths

Pending

|

2 PM

|

History

Pending

|

6 PM

|

Daily Revision
```

Current session highlighted.

Completed sessions green.

Upcoming gray.

---

# 16. Calendar Module

Purpose

Revision management.

Calendar should automatically generate revision reminders.

Types

Same Day Revision

Next Day Revision

Weekly Revision

15 Day Revision

Monthly Revision

---

## Same Day Revision

Appears after all study sessions.

Includes

Timer

Pause

Finish

Reflection Notes

Topics Revised

---

## Next Day Revision

Automatically generated.

Button

Start Yesterday's Revision

Includes

Topics

Yesterday's Notes

Timer

Completion Record

---

## Weekly Revision

Every Sunday.

Collects

Entire week's topics.

Timer based.

Reflection.

---

## 15 Day Revision

Occurs every 15th.

Includes

All topics studied since previous revision.

---

## Monthly Revision

Last day of month.

Large revision checklist.

Summary.

Reflection.

---

# 17. Notes

Every session supports

Quick Notes

Doubts

Important Facts

Mistakes

These notes automatically appear in revision sessions.

---

# 18. Analytics

This is the heart of the application.

Every interaction generates data.

Store

Session Start

Session End

Actual Study Time

Pause Time

Pause Count

Topics

Completion %

Notes

Revision Time

Daily Plans

Skipped Sessions

Everything should become visual.

---

# 19. Analytics Dashboard

## Overview

Today's Hours

This Week

This Month

Lifetime

Current Streak

Longest Streak

Average Session

Average Break

Total Topics Completed

Total Hours

Revision Completion %

---

## Study Heatmap

GitHub style.

Color intensity

Based on hours studied.

Clicking a day expands.

---

Expanded View

Morning Session

Afternoon

Evening

Revision

Each session visualized vertically.

Example

```
8:00

██████████

Study

9:15

░░░░

Break

9:30

████████████

Study

11:45

░░░░

Lunch

12:30

██████

Study

2:00
```

Green

Study

Gray

Pause

---

## Timeline Chart

Actual daily timeline.

Minute accurate.

Can zoom.

---

## Study Trend

Line graph.

Options

7 Days

30 Days

60 Days

90 Days

All Time

Y Axis

Hours

X Axis

Days

---

## Subject Analytics

Hours per subject

Completion %

Average Session Length

Average Progress Per Session

Most Productive Subject

Least Studied Subject

Revision Completion

---

## Topic Analytics

Every topic displays

Started

Current %

Time Invested

Sessions

Days Active

Completion Date

---

## Productivity

Best Day

Best Week

Best Month

Longest Session

Deepest Focus Session

Average Start Time

Average End Time

Average Break Length

Most Consistent Week

Most Productive Month

---

## Focus Analytics

Total Study Time

Total Pause Time

Focus Ratio

Example

```
Study

86%

Break

14%
```

---

## Time Distribution

Pie Chart

Politics

Economics

History

Maths

English

Geography

Science

Reasoning

Current Affairs

---

## Consistency

Current Streak

Longest Streak

Missed Days

Recovery Days

Perfect Weeks

Perfect Months

---

## Planning Accuracy

Planned Sessions

Completed Sessions

Skipped Sessions

Completion %

Planned Hours

Actual Hours

Difference

---

## Revision Analytics

Same Day Completion

Next Day Completion

Weekly Completion

Monthly Completion

Missed Revisions

Revision Time

---

## Reflection Analytics

Word cloud of notes.

Most common struggles.

Frequently postponed subjects.

Frequently unfinished topics.

---

## Study Clock

Circular 24 hour clock.

Shows

When studying

When taking breaks

Across entire month.

Patterns become obvious.

---

## Session Replay

Select any day.

Replay the study timeline.

Watch

Start

Pause

Resume

Finish

As if replaying the day.

---

# 20. Database Objects

### User

### Subjects

### Topics

### Daily Plans

### Sessions

### Pause Logs

### Notes

### Revisions

### Calendar Events

### Analytics Cache

### Achievements (optional future)

---

# 21. Future Features

* Smart schedule recommendations based on historical performance
* AI generated daily reflections
* Burnout detection using declining focus ratios
* Adaptive revision scheduling based on completion and recall
* Predictive exam readiness score
* Estimated syllabus completion date
* Subject wise confidence scoring
* Voice dictated reflections
* PDF export of analytics and study history
* Offline mode with automatic sync
* Data backup and restore
* Custom study patterns beyond the fixed MPSC schedule
* Optional accountability mode where a trusted partner can view progress
* Widgets for quick session start and revision reminders

---

# 22. Success Metrics

* Daily planning completed before the first session on at least 90% of study days
* At least 85% of planned sessions started
* At least 75% of planned sessions completed
* Same day revision completed on at least 80% of days
* Weekly revision completed every Sunday
* Increasing average study hours over time
* Improving focus ratio (study time versus pause time)
* Consistent study streaks with fewer missed days
* Complete historical visibility into every study session, revision, and topic progression over the entire preparation period.


# 23. Design Requirements

## Design Philosophy

The application should not feel like a productivity app.

It should feel like a personal study journal made with love.

Every interaction should reduce stress rather than create pressure. The interface should encourage studying through warmth, comfort, and visual softness instead of aggressive productivity.

Design inspiration:

* Cozy digital journal
* Minimal stationery aesthetic
* Soft planner
* Scrapbook
* Study desk companion

The experience should feel like someone quietly cheering you on.

---

# Design Keywords

* Cute
* Soft
* Cozy
* Calm
* Personal
* Feminine
* Minimal
* Elegant
* Handcrafted
* Airy
* Wholesome

---

# Color Palette

## Overall Theme

White first.

Everything else should be subtle.

Avoid saturated or vibrant colors.

### Background

* Warm White
* Ivory
* Cream White

### Primary Accent

Pastel Green

Used for

* Completed sessions
* Active timer
* Success states
* Progress

### Secondary Accent

Pastel Pink

Used for

* Buttons
* Cards
* Empty states
* Cute illustrations

### Third Accent

Pastel Yellow

Used for

* Daily goals
* Highlights
* Important reminders

### Optional Accent

Pastel Lavender

Used sparingly for analytics and charts.

---

## Colors to Avoid

* Pure black
* Neon colors
* Bright blue
* Dark red
* High contrast gradients
* Heavy shadows

Everything should remain soft.

---

# Typography

Rounded fonts preferred.

Examples

* Nunito
* Quicksand
* Poppins
* Outfit

Headers should feel friendly rather than corporate.

Body text should prioritize readability.

---

# Corner Radius

Everything rounded.

Buttons

20 to 28px radius

Cards

24px radius

Inputs

18px radius

Popups

30px radius

No sharp edges.

---

# Shadows

Very subtle.

Almost invisible.

Soft floating cards.

No heavy elevation.

---

# Illustrations

Hand drawn doodles throughout the application.

Examples

* Little flowers
* Leaves
* Stars
* Hearts
* Coffee mug
* Books
* Pencil
* Sticky notes
* Tiny clouds
* Sparkles
* Rabbits
* Cats
* Small birds
* Butterflies

These should never interfere with usability.

They simply make the interface feel alive.

---

# Decorative Elements

Occasionally decorate screens with

* Washi tape
* Paper clips
* Sticky notes
* Torn paper edges
* Notebook margins
* Underlines drawn with marker
* Small stickers

The UI should resemble a premium digital planner.

---

# Animations

Everything should feel smooth.

Examples

* Button press bounce
* Cards gently floating in
* Progress bars filling smoothly
* Timer counting with subtle transitions
* Popups scaling softly
* Confetti only when completing an entire day's study plan

No flashy animations.

No spinning loaders.

No excessive motion.

---

# Icons

Use rounded icon sets.

Examples

* Lucide
* Phosphor Rounded

Icons should be simple and friendly.

---

# Buttons

Large.

Rounded.

Comfortable spacing.

Hover

Slight scale up.

Pressed

Tiny bounce.

Selected

Pastel background with darker outline.

---

# Cards

Cards should resemble little pieces of paper.

Each card should have

* Rounded corners
* Soft shadow
* Plenty of whitespace
* Small doodle in one corner

---

# Progress Visualization

Avoid harsh progress bars.

Instead use

* Rounded capsules
* Circular rings
* Growing flowers
* Blooming leaves
* Filling jars

Example

Instead of

```
████████░░
```

Use

```
🌱 🌱 🌱 🌱 🌱 🌱 🌿 🌿
```

Conceptually, progress should feel like growth rather than completion.

---

# Empty States

Never leave blank pages.

Example

"No study sessions yet today."

Instead

> "A fresh day begins. Let's write today's story."

or

> "Your study journal is waiting for its first page today."

Include a small illustration.

---

# Home Screen Mood

The home screen should feel like opening a diary every morning.

Instead of

```
Today's Tasks
```

Use

```
Good Morning, Riya ☀️
Ready to begin another little step toward becoming an ASO?
```

Below that

Today's study timeline.

---

# Timer Screen

The timer screen should feel calming.

Large timer.

Subject at top.

Tiny encouraging messages rotating occasionally.

Examples

* One page at a time.
* Small progress is still progress.
* Keep going.
* You're doing well.
* Stay with this chapter.
* Future you will be proud.

Messages should never interrupt studying.

---

# Analytics Theme

Even analytics should remain soft.

Avoid

Corporate dashboards.

Instead

* Rounded charts
* Pastel graphs
* Hand drawn section dividers
* Warm colors

GitHub heatmap should use pastel greens.

---

# Calendar

Instead of a plain calendar

Make it resemble a planner.

Revision days

Small colored stickers.

Examples

📖 Weekly Revision

🌸 Monthly Revision

🍀 Same Day Revision

📌 Tomorrow Revision

Use soft icons throughout.

---

# Notifications

Notifications should sound supportive.

Instead of

```
Session Missed
```

Use

```
Morning session is waiting whenever you're ready.
```

Instead of

```
Revision Pending
```

Use

```
Your notes from yesterday would love a quick revisit.
```

---

# Micro Interactions

Every successful action should provide tiny satisfying feedback.

Examples

* Checkbox fills with a flower.
* Button gently pops.
* Progress ring blooms.
* Card slides into completed section.
* Topic completion animates smoothly.
* Tiny sparkle appears after saving notes.

These animations should last under 300 ms.

---

# Personalization

The application is built for one person.

It should frequently use her name naturally.

Examples

* Good Morning, Riya.
* Welcome back, Riya.
* Ready for today's first session?
* You completed everything you planned yesterday.
* Keep the streak alive.

The experience should feel handcrafted specifically for her rather than like a generic study application.

---

# Overall Feeling

If Notion is **organized**, and Duolingo is **playful**, this app should be **comforting**.

The desired emotional response is:

> "Opening this app should feel like sitting down at a clean desk with a warm cup of coffee, a fresh notebook, and someone quietly believing in you."
