import { getStudyDayKey } from "@/lib/date";
import type { ShiftSlot } from "@/lib/supabase/types";

export type ShiftSelection = {
  subjectName: string | null;
  subjectId: string | null;
  topicId: string | null;
  topicName: string | null;
};

export type DailyPlanLocal = {
  planDate: string;
  shifts: Record<ShiftSlot, ShiftSelection>;
  pledgedAt: string | null;
  status: "draft" | "pledged" | "in_progress" | "completed" | "rest";
};

const STORAGE_KEY = "ririso:daily-plan";

export const emptyShift = (): ShiftSelection => ({
  subjectName: null,
  subjectId: null,
  topicId: null,
  topicName: null,
});

export function emptyPlan(planDate = getStudyDayKey()): DailyPlanLocal {
  return {
    planDate,
    shifts: {
      morning: emptyShift(),
      second: emptyShift(),
      third: emptyShift(),
      additional: emptyShift(),
    },
    pledgedAt: null,
    status: "draft",
  };
}

export function loadTodayPlan(): DailyPlanLocal {
  if (typeof window === "undefined") return emptyPlan();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyPlan();
  try {
    const parsed = JSON.parse(raw) as DailyPlanLocal;
    if (parsed.planDate !== getStudyDayKey()) return emptyPlan();
    return parsed;
  } catch {
    return emptyPlan();
  }
}

export function saveTodayPlan(plan: DailyPlanLocal) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function hasPledgedToday(): boolean {
  const plan = loadTodayPlan();
  return Boolean(plan.pledgedAt) || plan.status === "rest";
}

export function countActiveShifts(plan: DailyPlanLocal): number {
  return (Object.values(plan.shifts) as ShiftSelection[]).filter(
    (s) => s.subjectName && s.subjectName !== "None",
  ).length;
}
