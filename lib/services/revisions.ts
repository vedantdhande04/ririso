import { createServerClient } from "@/lib/supabase/server";
import type { RevisionType } from "@/lib/supabase/types";

const revisionLabels: Record<RevisionType, string> = {
  same_day: "Same Day Revision",
  next_day: "Tomorrow Revision",
  weekly: "Weekly Revision",
  fifteen_day: "15 Day Revision",
  monthly: "Monthly Revision",
};

const revisionEventType = {
  same_day: "same_day_revision",
  next_day: "next_day_revision",
  weekly: "weekly_revision",
  fifteen_day: "fifteen_day_revision",
  monthly: "monthly_revision",
} as const;

export async function createRevisionEvent(input: {
  userId: string;
  revisionType: RevisionType;
  scheduledFor: string;
  topicIds?: string[];
  rangeStart?: string | null;
  rangeEnd?: string | null;
}) {
  const supabase = createServerClient();

  const { data: revision, error } = await supabase
    .from("revisions")
    .insert({
      user_id: input.userId,
      revision_type: input.revisionType,
      scheduled_for: input.scheduledFor,
      topic_ids: input.topicIds ?? [],
      range_start: input.rangeStart ?? null,
      range_end: input.rangeEnd ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: eventError } = await supabase.from("calendar_events").insert({
    user_id: input.userId,
    event_date: input.scheduledFor,
    event_type: revisionEventType[input.revisionType],
    revision_id: revision.id,
    label: revisionLabels[input.revisionType],
  });

  if (eventError) throw eventError;
  return revision;
}

/** After study sessions complete, schedule same-day + next-day revisions. */
export async function createRevisionEventsFromCompletedDay(input: {
  userId: string;
  planDate: string;
  topicIds: string[];
  nextDayDate: string;
}) {
  const sameDay = await createRevisionEvent({
    userId: input.userId,
    revisionType: "same_day",
    scheduledFor: input.planDate,
    topicIds: input.topicIds,
    rangeStart: input.planDate,
    rangeEnd: input.planDate,
  });

  const nextDay = await createRevisionEvent({
    userId: input.userId,
    revisionType: "next_day",
    scheduledFor: input.nextDayDate,
    topicIds: input.topicIds,
    rangeStart: input.planDate,
    rangeEnd: input.planDate,
  });

  return { sameDay, nextDay };
}
