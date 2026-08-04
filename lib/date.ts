import { STUDY_DAY_START_HOUR } from "@/lib/constants";

/** Returns the study-day date key (YYYY-MM-DD) for a given local Date. */
export function getStudyDayKey(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < STUDY_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastPlanningGate(date: Date = new Date()): boolean {
  return date.getHours() >= STUDY_DAY_START_HOUR;
}

export function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLastDayOfMonth(dateKey: string): boolean {
  const next = addDays(dateKey, 1);
  return next.slice(5, 7) !== dateKey.slice(5, 7);
}

/** Day of month 1–31 */
export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay();
}
