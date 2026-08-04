import { createServerClient } from "@/lib/supabase/server";

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Streak = consecutive study days with a completed daily plan. */
export async function computeStreak(userId: string, asOfDate: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_plans")
    .select("plan_date, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("plan_date", { ascending: false });

  if (error) throw error;

  const completed = new Set((data ?? []).map((row) => row.plan_date));
  let current = 0;
  let cursor = asOfDate;

  while (completed.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  const sorted = [...completed].sort();
  for (let i = 0; i < sorted.length; i += 1) {
    if (i === 0 || sorted[i] === addDays(sorted[i - 1], 1)) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest };
}
