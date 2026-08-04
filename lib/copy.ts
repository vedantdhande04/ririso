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
