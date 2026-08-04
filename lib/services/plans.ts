import { getStudyDayKey } from "@/lib/date";
import { createServerClient } from "@/lib/supabase/server";
import type { PlanStatus, ShiftSlot } from "@/lib/supabase/types";

export async function getPrimaryUserId() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("name", "Riya")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function getOrCreateTodayPlan(planDate = getStudyDayKey()) {
  const supabase = createServerClient();
  const userId = await getPrimaryUserId();
  if (!userId) throw new Error("Primary user Riya not found. Run seed.sql.");

  const { data: existing, error: existingError } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("daily_plans")
    .insert({ user_id: userId, plan_date: planDate, status: "draft" })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

export async function hasCompletedMandatoryPlanning(
  planDate = getStudyDayKey(),
) {
  const supabase = createServerClient();
  const userId = await getPrimaryUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("daily_plans")
    .select("status, pledged_at")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  const pledgedStatuses: PlanStatus[] = [
    "pledged",
    "in_progress",
    "completed",
    "rest",
  ];
  return Boolean(data.pledged_at) || pledgedStatuses.includes(data.status);
}

export type PlannedShiftInput = {
  shift_slot: ShiftSlot;
  subject_id: string | null;
  topic_id: string | null;
  is_none: boolean;
  sort_order: number;
};

export async function saveDailyPlanDraft(
  shifts: PlannedShiftInput[],
  planDate = getStudyDayKey(),
) {
  const supabase = createServerClient();
  const plan = await getOrCreateTodayPlan(planDate);

  await supabase.from("planned_sessions").delete().eq("daily_plan_id", plan.id);

  if (shifts.length > 0) {
    const { error } = await supabase.from("planned_sessions").insert(
      shifts.map((shift) => ({
        daily_plan_id: plan.id,
        ...shift,
        status: "pending" as const,
      })),
    );
    if (error) throw error;
  }

  const { data, error: updateError } = await supabase
    .from("daily_plans")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", plan.id)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return data;
}
