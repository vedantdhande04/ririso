export const APP_NAME = "RIRISO";
export const USER_NAME = process.env.NEXT_PUBLIC_USER_NAME ?? "Riya";

/** Study day rolls over at 6:00 AM local time (PRD). */
export const STUDY_DAY_START_HOUR = 6;

export const SHIFTS = {
  morning: "morning",
  second: "second",
  third: "third",
  additional: "additional",
} as const;

export type ShiftKey = (typeof SHIFTS)[keyof typeof SHIFTS];

export const MORNING_SUBJECTS = [
  "Politics",
  "Economics",
  "English",
  "Marathi",
  "None",
] as const;

export const SECOND_SUBJECTS = ["Maths", "None"] as const;

export const THIRD_SUBJECTS = ["History", "Geography", "None"] as const;

export const ADDITIONAL_SUBJECTS = [
  "General Science",
  "Current Affairs",
  "Reasoning",
  "None",
] as const;
