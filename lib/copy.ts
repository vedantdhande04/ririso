import { USER_NAME } from "@/lib/constants";

export function greet(time: Date = new Date()): string {
  const hour = time.getHours();
  if (hour < 12) return `Good morning, ${USER_NAME}`;
  if (hour < 17) return `Good afternoon, ${USER_NAME}`;
  return `Good evening, ${USER_NAME}`;
}

export function welcomeBack(): string {
  return `Welcome back, ${USER_NAME}`;
}

export type HomeMoment =
  | "not_planned"
  | "ready_to_pledge"
  | "no_sessions_started"
  | "first_session_done"
  | "mid_day_progress"
  | "one_session_left"
  | "all_study_done_revision_left"
  | "revision_in_progress"
  | "day_complete"
  | "rest_day";

export const momentLines: Record<HomeMoment, string[]> = {
  not_planned: [
    "A fresh page is waiting whenever you're ready.",
    `Whenever you like, ${USER_NAME} — plan the day gently.`,
    "Your study journal is waiting for today's first lines.",
  ],
  ready_to_pledge: [
    `Your plan looks lovely, ${USER_NAME}. Ready to pledge?`,
    "Subjects chosen — a quiet promise is all that's left.",
    "One soft pledge, then you can begin any session you like.",
  ],
  no_sessions_started: [
    `Ready for today's first session, ${USER_NAME}?`,
    "Start whichever block feels right — there's no wrong order.",
    "A calm beginning is still a beginning. Pick a session when ready.",
  ],
  first_session_done: [
    "Good job on completing the first session of the day!!",
    `Beautiful start, ${USER_NAME}. The next block can wait until you're ready.`,
    "First session done — that counts for more than it looks.",
  ],
  mid_day_progress: [
    "You're moving through the day with care. Keep going gently.",
    `Nice progress, ${USER_NAME}. Pause whenever you need to.`,
    "Another page turned. The remaining blocks will be there.",
  ],
  one_session_left: [
    "Just one study block left — you've got this.",
    `Almost there, ${USER_NAME}. One more session when you're ready.`,
    "One soft push left for today's study plan.",
  ],
  all_study_done_revision_left: [
    `Now only revision is left, ${USER_NAME} — let's do this!`,
    "Study blocks done. A gentle revisit would love your company.",
    "What a day of studying — revision is the cozy last page.",
  ],
  revision_in_progress: [
    "Revision in motion — soft and steady is perfect.",
    `Revisiting notes looks good on you, ${USER_NAME}.`,
    "Take your time with revision. Clarity grows quietly.",
  ],
  day_complete: [
    `You completed everything you planned today, ${USER_NAME}. Rest well.`,
    "Day complete — future you is already proud.",
    "What a full, gentle study day. Close the journal softly.",
  ],
  rest_day: [
    "A rest day is still part of becoming an ASO.",
    `Rest looks wise today, ${USER_NAME}.`,
    "No sessions needed — softness counts too.",
  ],
};

export function pickMomentLine(moment: HomeMoment): string {
  const lines = momentLines[moment];
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0];
}

export const supportive = {
  sessionWaiting: "Morning session is waiting whenever you're ready.",
  revisionPending: "Your notes from yesterday would love a quick revisit.",
  emptyToday: "A fresh day begins. Let's write today's story.",
  journalWaiting: "Your study journal is waiting for its first page today.",
  keepGoing: "Small progress is still progress.",
  readyFirst: `Ready for today's first session, ${USER_NAME}?`,
  completedYesterday: `You completed everything you planned yesterday, ${USER_NAME}.`,
  streakAlive: "Keep the streak alive — gently.",
  topicsEmpty: "Your topic garden is empty. Plant the first one when you plan.",
  analyticsEmpty:
    "A blank page for now — your charts will bloom with study days.",
  calendarQuiet: "A quiet page — no revision stickers here yet.",
} as const;

export const pledgeVariants = [
  "I Pledge To Complete Today's Target",
  "I Will Finish What I Planned Today",
  "No Excuses. Let's Begin.",
] as const;

export const timerNudge = [
  "One page at a time.",
  "Small progress is still progress.",
  "Keep going.",
  "You're doing well.",
  "Stay with this chapter.",
  "Future you will be proud.",
] as const;

export const shiftLabels: Record<string, string> = {
  morning: "Morning",
  second: "Second",
  third: "Third",
  additional: "Additional",
  extra: "Extra",
};
