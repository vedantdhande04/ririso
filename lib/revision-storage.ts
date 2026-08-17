import {
  addDays,
  dayOfMonth,
  getStudyDayKey,
  isLastDayOfMonth,
  weekday,
} from "@/lib/date";
import { invalidateAnalyticsCache } from "@/lib/analytics-cache";
import { flushLocalState, notifyLocalDataChanged } from "@/lib/device-sync";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RevisionType } from "@/lib/supabase/types";
import { loadDaySessions } from "@/lib/session-storage";

export type RevisionRunStatus = "pending" | "active" | "paused";

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
  runStatus: RevisionRunStatus;
  segmentStartedAt: string | null;
  /** Study session this optional overlook belongs to. */
  sourceSessionId: string | null;
  /** Latest pause/resume/start — newer device wins on sync. */
  lastMutatedAt: string | null;
};

export type CalendarSticker = {
  date: string;
  revisionType: RevisionType;
  label: string;
  revisionId: string;
};

const REV_KEY = "ririso:revisions";
const CAL_KEY = "ririso:calendar-events";

export const revisionLabels: Record<RevisionType, string> = {
  session: "Session revision",
  same_day: "Daily revision",
  next_day: "Yesterday's revision",
  weekly: "Weekly revision",
  fifteen_day: "15 day revision",
  monthly: "Monthly revision",
};

export function revisionDisplayTitle(r: LocalRevision): string {
  if (r.revisionType === "session" && r.topicNames[0]) {
    return `Session revision · ${r.topicNames[0]}`;
  }
  return revisionLabels[r.revisionType] ?? "Revision";
}

function normalizeRevision(raw: LocalRevision): LocalRevision {
  const completed = Boolean(raw.completedAt);
  return {
    ...raw,
    reflection: raw.reflection ?? "",
    studyMs: raw.studyMs ?? 0,
    sourceSessionId: raw.sourceSessionId ?? null,
    lastMutatedAt: raw.lastMutatedAt ?? null,
    runStatus: completed
      ? "pending"
      : raw.runStatus === "active" || raw.runStatus === "paused"
        ? raw.runStatus
        : "pending",
    segmentStartedAt: completed ? null : (raw.segmentStartedAt ?? null),
  };
}

function blankRunFields(): Pick<
  LocalRevision,
  "runStatus" | "segmentStartedAt" | "sourceSessionId" | "lastMutatedAt"
> {
  return {
    runStatus: "pending",
    segmentStartedAt: null,
    sourceSessionId: null,
    lastMutatedAt: null,
  };
}

function loadRevisions(): LocalRevision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REV_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as LocalRevision[]).map(normalizeRevision);
  } catch {
    return [];
  }
}

function writeRevisionsLocal(items: LocalRevision[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REV_KEY, JSON.stringify(items));
}

function saveRevisions(items: LocalRevision[]) {
  writeRevisionsLocal(items);
  notifyLocalDataChanged();
  window.dispatchEvent(new Event("ririso:sessions-changed"));
  void flushLocalState();
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
  notifyLocalDataChanged();
}

export function revisionHref(type: RevisionType = "same_day", id?: string) {
  if (id) return `/revision?type=${type}&id=${encodeURIComponent(id)}`;
  return `/revision?type=${type}`;
}

export function liveRevisionMs(revision: LocalRevision, now = Date.now()) {
  if (revision.completedAt) return revision.studyMs;
  if (revision.runStatus === "active" && revision.segmentStartedAt) {
    return (
      revision.studyMs +
      Math.max(0, now - new Date(revision.segmentStartedAt).getTime())
    );
  }
  return revision.studyMs;
}

/** In-progress revision for today (active or paused). */
export function getOpenRevision(planDate = getStudyDayKey()) {
  return (
    loadRevisions().find(
      (r) =>
        r.scheduledFor === planDate &&
        !r.completedAt &&
        (r.runStatus === "active" || r.runStatus === "paused"),
    ) ?? null
  );
}

export function getRevisionById(id: string) {
  return loadRevisions().find((r) => r.id === id) ?? null;
}

export function getRevisionsForDate(dateKey: string) {
  return loadRevisions().filter((r) => r.scheduledFor === dateKey);
}

export function getAllRevisions() {
  return loadRevisions();
}

/** Today's revision todos: yesterday's + daily + open session oversights. */
export function getTodayRevisionTodos(planDate = getStudyDayKey()) {
  const all = loadRevisions().filter((r) => r.scheduledFor === planDate);
  const yesterday = all.find((r) => r.revisionType === "next_day") ?? null;
  const daily = all.find((r) => r.revisionType === "same_day") ?? null;
  const weekly = all.find((r) => r.revisionType === "weekly") ?? null;
  const fifteen = all.find((r) => r.revisionType === "fifteen_day") ?? null;
  const monthly = all.find((r) => r.revisionType === "monthly") ?? null;
  const sessions = all.filter((r) => r.revisionType === "session");
  return { yesterday, daily, weekly, fifteen, monthly, sessions };
}

export function getUpcomingRevisions(limit = 12) {
  const today = getStudyDayKey();
  return loadRevisions()
    .filter((r) => !r.completedAt && r.scheduledFor >= today)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, limit);
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
  const normalized = normalizeRevision(revision);
  const all = loadRevisions().filter((r) => {
    if (normalized.revisionType === "session") {
      if (normalized.sourceSessionId) {
        return r.sourceSessionId !== normalized.sourceSessionId;
      }
      return r.id !== normalized.id;
    }
    return !(
      r.revisionType === normalized.revisionType &&
      r.scheduledFor === normalized.scheduledFor
    );
  });
  all.push(normalized);
  saveRevisions(all);

  if (normalized.revisionType !== "session") {
    const stickers = loadStickers().filter(
      (s) =>
        !(
          s.revisionType === normalized.revisionType &&
          s.date === normalized.scheduledFor
        ),
    );
    stickers.push({
      date: normalized.scheduledFor,
      revisionType: normalized.revisionType,
      label: revisionLabels[normalized.revisionType],
      revisionId: normalized.id,
    });
    saveStickers(stickers);
  }
  return normalized;
}

function patchRevision(
  revisionId: string,
  patch: Partial<LocalRevision>,
): LocalRevision | null {
  let updated: LocalRevision | null = null;
  const stamp = new Date().toISOString();
  const all = loadRevisions().map((r) => {
    if (r.id !== revisionId) return r;
    updated = normalizeRevision({
      ...r,
      ...patch,
      lastMutatedAt: stamp,
    });
    return updated;
  });
  if (!updated) return null;
  saveRevisions(all);
  return updated;
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
        | "session_revision"
        | "same_day_revision"
        | "next_day_revision"
        | "weekly_revision"
        | "fifteen_day_revision"
        | "monthly_revision",
      revision_id: data.id,
      label: revisionLabels[revision.revisionType],
    });
  } catch (err) {
    console.warn("Supabase revision sync failed", err);
  }
}

function newRevisionDraft(input: {
  revisionType: RevisionType;
  scheduledFor: string;
  topicIds: string[];
  topicNames: string[];
  rangeStart: string | null;
  rangeEnd: string | null;
  sourceSessionId?: string | null;
}): LocalRevision {
  return {
    id: crypto.randomUUID(),
    revisionType: input.revisionType,
    scheduledFor: input.scheduledFor,
    topicIds: input.topicIds,
    topicNames: input.topicNames,
    completedAt: null,
    studyMs: 0,
    reflection: "",
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    ...blankRunFields(),
    sourceSessionId: input.sourceSessionId ?? null,
  };
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

  const sameDay = newRevisionDraft({
    revisionType: "same_day",
    scheduledFor: planDate,
    topicIds,
    topicNames,
    rangeStart: planDate,
    rangeEnd: planDate,
  });
  upsertLocalRevision(sameDay);
  await syncRevisionToSupabase(sameDay);
  invalidateAnalyticsCache();
  return sameDay;
}

function refreshRevisionTopics(revision: LocalRevision) {
  if (revision.revisionType === "session") return revision;
  const day = loadDaySessions();
  const topicIds = [...new Set(day.sessions.map((s) => s.topicId))];
  const topicNames = [
    ...new Set(day.sessions.map((s) => s.topicName).filter(Boolean)),
  ];
  return upsertLocalRevision({ ...revision, topicIds, topicNames });
}

/** Optional short overlook after finishing one study block. */
export function createSessionRevision(input: {
  sessionId: string;
  topicId: string;
  topicName: string;
}): LocalRevision {
  const existing = loadRevisions().find(
    (r) =>
      r.revisionType === "session" && r.sourceSessionId === input.sessionId,
  );
  if (existing) return existing;

  const planDate = getStudyDayKey();
  const draft = newRevisionDraft({
    revisionType: "session",
    scheduledFor: planDate,
    topicIds: [input.topicId],
    topicNames: [input.topicName],
    rangeStart: planDate,
    rangeEnd: planDate,
    sourceSessionId: input.sessionId,
  });
  upsertLocalRevision(draft);
  void syncRevisionToSupabase(draft);
  invalidateAnalyticsCache();
  return draft;
}

/**
 * Start only when pending. Never auto-resume a paused timer —
 * call resumeRevisionTimer explicitly from the Resume button.
 */
export function beginRevisionTimer(revisionId: string): LocalRevision | null {
  const current = loadRevisions().find((r) => r.id === revisionId);
  if (!current || current.completedAt) return current ?? null;
  if (current.runStatus === "active" || current.runStatus === "paused") {
    return current;
  }
  return patchRevision(revisionId, {
    runStatus: "active",
    segmentStartedAt: new Date().toISOString(),
    studyMs: current.studyMs || 0,
  });
}

export function pauseRevisionTimer(revisionId: string): LocalRevision | null {
  const current = loadRevisions().find((r) => r.id === revisionId);
  if (!current || current.completedAt || current.runStatus !== "active") {
    return current ?? null;
  }
  const studied = liveRevisionMs(current);
  return patchRevision(revisionId, {
    runStatus: "paused",
    studyMs: studied,
    segmentStartedAt: null,
  });
}

export function resumeRevisionTimer(revisionId: string): LocalRevision | null {
  const current = loadRevisions().find((r) => r.id === revisionId);
  if (!current || current.completedAt || current.runStatus !== "paused") {
    return current ?? null;
  }
  return patchRevision(revisionId, {
    runStatus: "active",
    segmentStartedAt: new Date().toISOString(),
  });
}

/** Bank live seconds while keeping the timer active (refresh-safe). */
export function heartbeatRevisionTimer(
  revisionId: string,
): LocalRevision | null {
  const current = loadRevisions().find((r) => r.id === revisionId);
  if (!current || current.completedAt || current.runStatus !== "active") {
    return current ?? null;
  }
  const studied = liveRevisionMs(current);
  const stamp = new Date().toISOString();
  const updated = normalizeRevision({
    ...current,
    studyMs: studied,
    segmentStartedAt: stamp,
    lastMutatedAt: stamp,
  });
  const all = loadRevisions().map((r) => (r.id === revisionId ? updated : r));
  writeRevisionsLocal(all);
  return updated;
}

export function saveRevisionReflection(
  revisionId: string,
  reflection: string,
): LocalRevision | null {
  const current = loadRevisions().find((r) => r.id === revisionId);
  if (!current) return null;
  const updated = normalizeRevision({ ...current, reflection });
  const all = loadRevisions().map((r) => (r.id === revisionId ? updated : r));
  writeRevisionsLocal(all);
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
    : newRevisionDraft({
        revisionType: "same_day",
        scheduledFor: planDate,
        topicIds,
        topicNames,
        rangeStart: planDate,
        rangeEnd: planDate,
      });
  upsertLocalRevision(sameDay);
  if (!sameDayExisting) await syncRevisionToSupabase(sameDay);

  const nextExisting = loadRevisions().find(
    (r) => r.revisionType === "next_day" && r.scheduledFor === nextDay,
  );
  if (!nextExisting) {
    const nextDayRev = newRevisionDraft({
      revisionType: "next_day",
      scheduledFor: nextDay,
      topicIds,
      topicNames,
      rangeStart: planDate,
      rangeEnd: planDate,
    });
    upsertLocalRevision(nextDayRev);
    await syncRevisionToSupabase(nextDayRev);
  }

  if (weekday(planDate) === 0) {
    const weekly = newRevisionDraft({
      revisionType: "weekly",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      rangeStart: addDays(planDate, -6),
      rangeEnd: planDate,
    });
    upsertLocalRevision(weekly);
    await syncRevisionToSupabase(weekly);
  }

  if (dayOfMonth(planDate) === 15) {
    const fifteen = newRevisionDraft({
      revisionType: "fifteen_day",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      rangeStart: addDays(planDate, -14),
      rangeEnd: planDate,
    });
    upsertLocalRevision(fifteen);
    await syncRevisionToSupabase(fifteen);
  }

  if (isLastDayOfMonth(planDate)) {
    const monthly = newRevisionDraft({
      revisionType: "monthly",
      scheduledFor: planDate,
      topicIds,
      topicNames,
      rangeStart: `${planDate.slice(0, 8)}01`,
      rangeEnd: planDate,
    });
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
  const updated = patchRevision(revisionId, {
    completedAt: new Date().toISOString(),
    studyMs,
    reflection,
    runStatus: "pending",
    segmentStartedAt: null,
  });
  invalidateAnalyticsCache();
  return updated;
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
  if (revisionType === "session") {
    return (
      loadRevisions().find(
        (r) =>
          r.revisionType === "session" &&
          r.scheduledFor === planDate &&
          !r.completedAt,
      ) ?? null
    );
  }
  return (
    loadRevisions().find(
      (r) => r.revisionType === revisionType && r.scheduledFor === planDate,
    ) ?? null
  );
}

/** Total revision study ms for a plan date (counts toward study time). */
export function revisionStudyMsForDate(planDate: string) {
  return loadRevisions()
    .filter((r) => r.scheduledFor === planDate)
    .reduce((sum, r) => sum + liveRevisionMs(r), 0);
}
