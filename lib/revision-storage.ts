import {
  addDays,
  dayOfMonth,
  getStudyDayKey,
  isLastDayOfMonth,
  weekday,
} from "@/lib/date";
import { invalidateAnalyticsCache } from "@/lib/analytics-cache";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RevisionType } from "@/lib/supabase/types";
import { loadDaySessions } from "@/lib/session-storage";

export type LocalRevision = {
  id: string;
  revisionType: RevisionType;
  scheduledFor: string;
  topicIds: string[];
  topicNames: string[];
  completedAt: string | null;
  studyMs: number;
  reflection: string;
  rangeStart: string | null;
  rangeEnd: string | null;
};

export type CalendarSticker = {
  date: string;
  revisionType: RevisionType;
  label: string;
  revisionId: string;
};

const REV_KEY = "ririso:revisions";
const CAL_KEY = "ririso:calendar-events";

const labels: Record<RevisionType, string> = {
  same_day: "Same Day Revision",
  next_day: "Tomorrow Revision",
  weekly: "Weekly Revision",
  fifteen_day: "15 Day Revision",
  monthly: "Monthly Revision",
};

function loadRevisions(): LocalRevision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REV_KEY);
    return raw ? (JSON.parse(raw) as LocalRevision[]) : [];
  } catch {
    return [];
  }
}

function saveRevisions(items: LocalRevision[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REV_KEY, JSON.stringify(items));
}

function loadStickers(): CalendarSticker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CAL_KEY);
    return raw ? (JSON.parse(raw) as CalendarSticker[]) : [];
  } catch {
    return [];
  }
}

function saveStickers(items: CalendarSticker[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAL_KEY, JSON.stringify(items));
}

export function getRevisionsForDate(dateKey: string) {
  return loadRevisions().filter((r) => r.scheduledFor === dateKey);
}

export function getAllRevisions() {
  return loadRevisions();
}

export function getStickersForMonth(year: number, monthIndex: number) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return loadStickers().filter((s) => s.date.startsWith(prefix));
}

export function getUpcomingAlerts(limit = 3) {
  const today = getStudyDayKey();
  return loadStickers()
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

function upsertLocalRevision(revision: LocalRevision) {
  const all = loadRevisions().filter(
    (r) =>
      !(
        r.revisionType === revision.revisionType &&
        r.scheduledFor === revision.scheduledFor
      ),
  );
  all.push(revision);
  saveRevisions(all);

  const stickers = loadStickers().filter(
    (s) =>
      !(
        s.revisionType === revision.revisionType &&
        s.date === revision.scheduledFor
      ),
  );
  stickers.push({
    date: revision.scheduledFor,
    revisionType: revision.revisionType,
    label: labels[revision.revisionType],
    revisionId: revision.id,
  });
  saveStickers(stickers);
}

async function syncRevisionToSupabase(revision: LocalRevision) {
  try {
    const supabase = createBrowserClient();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("name", "Riya")
      .limit(1)
      .maybeSingle();
    if (!user) return;

    const { data, error } = await supabase
      .from("revisions")
      .insert({
        user_id: user.id,
        revision_type: revision.revisionType,
        scheduled_for: revision.scheduledFor,
        topic_ids: revision.topicIds,
        range_start: revision.rangeStart,
        range_end: revision.rangeEnd,
      })
      .select("id")
      .single();
    if (error || !data) return;

    await supabase.from("calendar_events").insert({
      user_id: user.id,
      event_date: revision.scheduledFor,
      event_type: `${revision.revisionType}_revision` as
        | "same_day_revision"
        | "next_day_revision"
        | "weekly_revision"
        | "fifteen_day_revision"
        | "monthly_revision",
      revision_id: data.id,
      label: labels[revision.revisionType],
    });
  } catch (err) {
    console.warn("Supabase revision sync failed", err);
  }
}

/** Ensure same-day revision exists early (at pledge) so home can show the block. */
export async function ensureSameDayRevision() {
  const planDate = getStudyDayKey();
  const existing = getSameDayRevision(planDate);
  if (existing) {
    return refreshRevisionTopics(existing);
  }

  const day = loadDaySessions();
  const topicIds = [...new Set(day.sessions.map((s) => s.topicId))];
  const topicNames = [
    ...new Set(day.sessions.map((s) => s.topicName).filter(Boolean)),
  ];

  const sameDay: LocalRevision = {
    id: crypto.randomUUID(),
    revisionType: "same_day",
    scheduledFor: planDate,
    topicIds,
    topicNames,
    completedAt: null,
    studyMs: 0,
    reflection: "",
    rangeStart: planDate,
    rangeEnd: planDate,
  };
  upsertLocalRevision(sameDay);
  await syncRevisionToSupabase(sameDay);
  invalidateAnalyticsCache();
  return sameDay;
}

function refreshRevisionTopics(revision: LocalRevision) {
  const day = loadDaySessions();
  const topicIds = [...new Set(day.sessions.map((s) => s.topicId))];
  const topicNames = [
    ...new Set(day.sessions.map((s) => s.topicName).filter(Boolean)),
  ];
  const updated = { ...revision, topicIds, topicNames };
  upsertLocalRevision(updated);
  return updated;
}

/** Call when study sessions finish or when refreshing end-of-day revisions. */
export async function schedulePostStudyRevisions() {
  const day = loadDaySessions();
  const topicIds = [
    ...new Set(
      day.sessions
        .filter((s) => s.status === "completed" || s.status === "skipped")
        .map((s) => s.topicId),
    ),
  ];
  const topicNames = [
    ...new Set(
      day.sessions
        .filter((s) => topicIds.includes(s.topicId))
        .map((s) => s.topicName),
    ),
  ];

  const planDate = day.planDate || getStudyDayKey();
  const nextDay = addDays(planDate, 1);

  const sameDayExisting = getSameDayRevision(planDate);
  const sameDay: LocalRevision = sameDayExisting
    ? {
        ...sameDayExisting,
        topicIds: topicIds.length ? topicIds : sameDayExisting.topicIds,
        topicNames: topicNames.length ? topicNames : sameDayExisting.topicNames,
      }
    : {
        id: crypto.randomUUID(),
        revisionType: "same_day",
        scheduledFor: planDate,
        topicIds,
        topicNames,
        completedAt: null,
        studyMs: 0,
        reflection: "",
        rangeStart: planDate,
        rangeEnd: planDate,
      };
  upsertLocalRevision(sameDay);
  if (!sameDayExisting) await syncRevisionToSupabase(sameDay);

  const nextDayRev: LocalRevision = {
    id: crypto.randomUUID(),
    revisionType: "next_day",
    scheduledFor: nextDay,
    topicIds,
    topicNames,
    completedAt: null,
    studyMs: 0,
    reflection: "",
    rangeStart: planDate,
    rangeEnd: planDate,
  };
  upsertLocalRevision(nextDayRev);
  await syncRevisionToSupabase(nextDayRev);

  if (weekday(planDate) === 0) {
    const weekly: LocalRevision = {
      id: crypto.randomUUID(),
      revisionType: "weekly",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      completedAt: null,
      studyMs: 0,
      reflection: "",
      rangeStart: addDays(planDate, -6),
      rangeEnd: planDate,
    };
    upsertLocalRevision(weekly);
    await syncRevisionToSupabase(weekly);
  }

  if (dayOfMonth(planDate) === 15) {
    const fifteen: LocalRevision = {
      id: crypto.randomUUID(),
      revisionType: "fifteen_day",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      completedAt: null,
      studyMs: 0,
      reflection: "",
      rangeStart: addDays(planDate, -14),
      rangeEnd: planDate,
    };
    upsertLocalRevision(fifteen);
    await syncRevisionToSupabase(fifteen);
  }

  if (isLastDayOfMonth(planDate)) {
    const monthly: LocalRevision = {
      id: crypto.randomUUID(),
      revisionType: "monthly",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      completedAt: null,
      studyMs: 0,
      reflection: "",
      rangeStart: `${planDate.slice(0, 8)}01`,
      rangeEnd: planDate,
    };
    upsertLocalRevision(monthly);
    await syncRevisionToSupabase(monthly);
  }

  invalidateAnalyticsCache();
  return sameDay;
}

export function completeRevision(
  revisionId: string,
  studyMs: number,
  reflection: string,
) {
  const all = loadRevisions().map((r) =>
    r.id === revisionId
      ? {
          ...r,
          completedAt: new Date().toISOString(),
          studyMs,
          reflection,
        }
      : r,
  );
  saveRevisions(all);
  invalidateAnalyticsCache();
  return all.find((r) => r.id === revisionId) ?? null;
}

export function getSameDayRevision(planDate = getStudyDayKey()) {
  return (
    loadRevisions().find(
      (r) => r.revisionType === "same_day" && r.scheduledFor === planDate,
    ) ?? null
  );
}

export function getNextDayRevisionForToday(planDate = getStudyDayKey()) {
  return (
    loadRevisions().find(
      (r) => r.revisionType === "next_day" && r.scheduledFor === planDate,
    ) ?? null
  );
}

export function getRevisionForTodayByType(
  revisionType: RevisionType,
  planDate = getStudyDayKey(),
) {
  if (revisionType === "same_day") return getSameDayRevision(planDate);
  if (revisionType === "next_day") return getNextDayRevisionForToday(planDate);
  return (
    loadRevisions().find(
      (r) => r.revisionType === revisionType && r.scheduledFor === planDate,
    ) ?? null
  );
}
