import { invalidateAnalyticsCache } from "@/lib/analytics-cache";
import { getStudyDayKey } from "@/lib/date";
import { archiveSession } from "@/lib/history-storage";
import type { ShiftSlot } from "@/lib/supabase/types";
import {
  loadTodayPlan,
  type DailyPlanLocal,
  type ShiftSelection,
} from "@/lib/planning-storage";

export type PauseReason =
  | "Break"
  | "Phone Call"
  | "Lunch"
  | "Washroom"
  | "Custom";

export type PauseRecord = {
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  reason: string | null;
};

export type SessionShift = ShiftSlot | "extra";

export type StudySessionLocal = {
  id: string;
  planDate: string;
  shift: SessionShift;
  subjectName: string;
  subjectId: string | null;
  topicId: string;
  topicName: string;
  isExtra: boolean;
  startedAt: string | null;
  endedAt: string | null;
  accumulatedStudyMs: number;
  pauseMs: number;
  pauseCount: number;
  pauses: PauseRecord[];
  activePauseStartedAt: string | null;
  status: "pending" | "active" | "paused" | "completed" | "skipped";
  completionPercent: number | null;
  notesLearned: string;
  notesRemaining: string;
  notesQuick: string;
  notesDoubt: string;
  notesFact: string;
  notesMistake: string;
};

export type DaySessionsState = {
  planDate: string;
  /** @deprecated kept for migration */
  queue?: Array<{
    shift: ShiftSlot;
    subjectName: string;
    topicId: string;
    topicName: string;
  }>;
  /** @deprecated kept for migration */
  currentIndex?: number;
  sessions: StudySessionLocal[];
};

const KEY = "ririso:sessions";

const SHIFT_ORDER: SessionShift[] = [
  "morning",
  "second",
  "third",
  "additional",
  "extra",
];

function plannedFromPlan(plan: DailyPlanLocal) {
  return (Object.entries(plan.shifts) as [ShiftSlot, ShiftSelection][])
    .filter(([, s]) => s.subjectName && s.subjectName !== "None" && s.topicId)
    .map(([shift, s]) => ({
      shift: shift as SessionShift,
      subjectName: s.subjectName!,
      subjectId: s.subjectId,
      topicId: s.topicId!,
      topicName: s.topicName!,
      isExtra: false,
    }));
}

function makePendingSession(input: {
  planDate: string;
  shift: SessionShift;
  subjectName: string;
  subjectId: string | null;
  topicId: string;
  topicName: string;
  isExtra?: boolean;
}): StudySessionLocal {
  return {
    id: crypto.randomUUID(),
    planDate: input.planDate,
    shift: input.shift,
    subjectName: input.subjectName,
    subjectId: input.subjectId,
    topicId: input.topicId,
    topicName: input.topicName,
    isExtra: Boolean(input.isExtra),
    startedAt: null,
    endedAt: null,
    accumulatedStudyMs: 0,
    pauseMs: 0,
    pauseCount: 0,
    pauses: [],
    activePauseStartedAt: null,
    status: "pending",
    completionPercent: null,
    notesLearned: "",
    notesRemaining: "",
    notesQuick: "",
    notesDoubt: "",
    notesFact: "",
    notesMistake: "",
  };
}

export function emptyDaySessions(): DaySessionsState {
  return {
    planDate: getStudyDayKey(),
    sessions: [],
  };
}

function normalizeSession(raw: StudySessionLocal): StudySessionLocal {
  const known: StudySessionLocal["status"][] = [
    "pending",
    "active",
    "paused",
    "completed",
    "skipped",
  ];
  const status = known.includes(raw.status)
    ? raw.status
    : raw.startedAt
      ? "active"
      : "pending";
  return {
    ...raw,
    subjectId: raw.subjectId ?? null,
    isExtra: Boolean(raw.isExtra),
    startedAt: raw.startedAt ?? null,
    status,
  };
}

function migrateLegacy(parsed: DaySessionsState): DaySessionsState {
  const planDate = parsed.planDate || getStudyDayKey();
  if (parsed.sessions?.length) {
    const sessions = parsed.sessions.map((s) => {
      const normalized = normalizeSession(s);
      // Legacy sessions without pending were created active immediately
      if (
        !normalized.startedAt &&
        normalized.status !== "pending" &&
        normalized.status !== "completed" &&
        normalized.status !== "skipped"
      ) {
        return { ...normalized, status: "pending" as const };
      }
      return normalized;
    });
    return { planDate, sessions };
  }

  // Build pending sessions from legacy queue
  const queue = parsed.queue ?? [];
  const sessions = queue.map((item) =>
    makePendingSession({
      planDate,
      shift: item.shift,
      subjectName: item.subjectName,
      subjectId: null,
      topicId: item.topicId,
      topicName: item.topicName,
    }),
  );
  return { planDate, sessions };
}

export function loadDaySessions(): DaySessionsState {
  if (typeof window === "undefined") return emptyDaySessions();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return initFromPlan();
  try {
    const parsed = JSON.parse(raw) as DaySessionsState;
    if (parsed.planDate !== getStudyDayKey()) return initFromPlan();
    const migrated = migrateLegacy(parsed);
    return reconcileWithPlan(migrated);
  } catch {
    return initFromPlan();
  }
}

export function saveDaySessions(state: DaySessionsState) {
  if (typeof window === "undefined") return;
  const clean: DaySessionsState = {
    planDate: state.planDate,
    sessions: state.sessions,
  };
  window.localStorage.setItem(KEY, JSON.stringify(clean));
  window.dispatchEvent(new Event("ririso:sessions-changed"));
}

function sessionKey(s: Pick<StudySessionLocal, "shift" | "topicId" | "isExtra" | "id">) {
  if (s.isExtra) return `extra:${s.id}`;
  return `${s.shift}:${s.topicId}`;
}

function reconcileWithPlan(state: DaySessionsState): DaySessionsState {
  const plan = loadTodayPlan();
  const desired = plannedFromPlan(plan);
  if (desired.length === 0 && state.sessions.every((s) => !s.isExtra)) {
    return state;
  }

  const hasProgress = state.sessions.some(
    (s) =>
      s.status === "completed" ||
      s.status === "skipped" ||
      s.status === "active" ||
      s.status === "paused" ||
      (s.accumulatedStudyMs > 0 && s.status !== "pending"),
  );

  const extras = state.sessions.filter((s) => s.isExtra);
  const nonExtras = state.sessions.filter((s) => !s.isExtra);

  if (!hasProgress && nonExtras.length === 0 && desired.length > 0) {
    return initFromPlan();
  }

  if (!hasProgress) {
    const desiredKeys = desired.map((d) => `${d.shift}:${d.topicId}`).sort().join("|");
    const existingKeys = nonExtras
      .map((s) => `${s.shift}:${s.topicId}`)
      .sort()
      .join("|");
    if (desiredKeys !== existingKeys && desired.length > 0) {
      const rebuilt = desired.map((d) =>
        makePendingSession({
          planDate: getStudyDayKey(),
          ...d,
        }),
      );
      const next = { planDate: getStudyDayKey(), sessions: [...rebuilt, ...extras] };
      saveDaySessions(next);
      return next;
    }
  }

  // Add missing planned sessions as pending without wiping progress
  if (desired.length > 0) {
    const existing = new Set(nonExtras.map((s) => `${s.shift}:${s.topicId}`));
    const missing = desired.filter((d) => !existing.has(`${d.shift}:${d.topicId}`));
    if (missing.length > 0) {
      const added = missing.map((d) =>
        makePendingSession({ planDate: state.planDate, ...d }),
      );
      const next = {
        planDate: state.planDate,
        sessions: [...state.sessions, ...added],
      };
      saveDaySessions(next);
      return next;
    }
  }

  return state;
}

export function initFromPlan(): DaySessionsState {
  const plan = loadTodayPlan();
  const planDate = getStudyDayKey();
  const sessions = plannedFromPlan(plan).map((d) =>
    makePendingSession({ planDate, ...d }),
  );
  const state: DaySessionsState = { planDate, sessions };
  saveDaySessions(state);
  return state;
}

export function resetQueueFromPlan(): DaySessionsState {
  return initFromPlan();
}

export function listSessionBlocks(state: DaySessionsState = loadDaySessions()) {
  return [...state.sessions].sort(
    (a, b) => SHIFT_ORDER.indexOf(a.shift) - SHIFT_ORDER.indexOf(b.shift),
  );
}

export function getSessionById(
  sessionId: string,
  state: DaySessionsState = loadDaySessions(),
) {
  return state.sessions.find((s) => s.id === sessionId) ?? null;
}

export function getActiveOrPausedSession(
  state: DaySessionsState = loadDaySessions(),
) {
  return (
    state.sessions.find((s) => s.status === "active") ??
    state.sessions.find((s) => s.status === "paused") ??
    null
  );
}

/** Active or paused session only — never auto-starts a pending block. */
export function getOpenSession(state: DaySessionsState = loadDaySessions()) {
  return getActiveOrPausedSession(state);
}

export function sessionHref(sessionId?: string | null) {
  return sessionId ? `/session?id=${sessionId}` : "/session";
}

export function allStudyBlocksResolved(state: DaySessionsState): boolean {
  if (state.sessions.length === 0) return false;
  return state.sessions.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );
}

/** @deprecated use allStudyBlocksResolved */
export function allQueueResolved(state: DaySessionsState): boolean {
  return allStudyBlocksResolved(state);
}

export function addExtraSession(input: {
  subjectName: string;
  subjectId: string | null;
  topicId: string;
  topicName: string;
  shift?: SessionShift;
}): DaySessionsState {
  const state = loadDaySessions();
  const session = makePendingSession({
    planDate: state.planDate || getStudyDayKey(),
    shift: input.shift ?? "extra",
    subjectName: input.subjectName,
    subjectId: input.subjectId,
    topicId: input.topicId,
    topicName: input.topicName,
    isExtra: true,
  });
  const next = { ...state, sessions: [...state.sessions, session] };
  saveDaySessions(next);
  return next;
}

export function startSession(
  state: DaySessionsState,
  sessionId: string,
): { state: DaySessionsState; session: StudySessionLocal | null; blockedById?: string } {
  const target = state.sessions.find((s) => s.id === sessionId);
  if (!target) return { state, session: null };
  if (target.status === "completed" || target.status === "skipped") {
    return { state, session: target };
  }
  if (target.status === "active") return { state, session: target };
  if (target.status === "paused") {
    const next = resumeSession(state, sessionId);
    return {
      state: next,
      session: next.sessions.find((s) => s.id === sessionId) ?? null,
    };
  }

  const otherActive = state.sessions.find(
    (s) => s.id !== sessionId && s.status === "active",
  );
  if (otherActive) {
    return { state, session: null, blockedById: otherActive.id };
  }

  const now = new Date().toISOString();
  const sessions = state.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          status: "active" as const,
          startedAt: now,
          activePauseStartedAt: null,
        }
      : s,
  );
  const next = { ...state, sessions };
  saveDaySessions(next);
  return { state: next, session: sessions.find((s) => s.id === sessionId) ?? null };
}

/** Start/resume a specific session. Without id, opens active/paused only (no auto-start). */
export function getOrStartCurrentSession(
  state: DaySessionsState,
  sessionId?: string | null,
): { state: DaySessionsState; session: StudySessionLocal | null; blockedById?: string } {
  if (sessionId) return startSession(state, sessionId);

  const open = getOpenSession(state);
  if (!open) return { state, session: null };
  return { state, session: open };
}

/** Persist-start a session then return the href to open it. */
export function beginSessionNavigation(sessionId: string): {
  href: string;
  blockedById?: string;
  session: StudySessionLocal | null;
} {
  const result = startSession(loadDaySessions(), sessionId);
  if (result.blockedById) {
    return {
      href: sessionHref(result.blockedById),
      blockedById: result.blockedById,
      session: result.session,
    };
  }
  return {
    href: sessionHref(sessionId),
    session: result.session,
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function liveElapsedMs(session: StudySessionLocal, now = Date.now()) {
  if (
    session.status === "completed" ||
    session.status === "skipped" ||
    session.status === "pending"
  ) {
    return session.accumulatedStudyMs;
  }
  if (session.status === "paused") {
    return session.accumulatedStudyMs;
  }
  return (
    session.accumulatedStudyMs + Math.max(0, now - getSegmentStart(session))
  );
}

function getSegmentStart(session: StudySessionLocal): number {
  if (session.status === "paused" && session.activePauseStartedAt) {
    return new Date(session.activePauseStartedAt).getTime();
  }
  const lastEndedPause = [...session.pauses].reverse().find((p) => p.endedAt);
  if (lastEndedPause?.endedAt) return new Date(lastEndedPause.endedAt).getTime();
  if (session.startedAt) return new Date(session.startedAt).getTime();
  return Date.now();
}

export function pauseSession(
  state: DaySessionsState,
  sessionId: string,
  reason: string | null,
): DaySessionsState {
  const now = Date.now();
  const sessions = state.sessions.map((s) => {
    if (s.id !== sessionId || s.status !== "active") return s;
    const studied = s.accumulatedStudyMs + Math.max(0, now - getSegmentStart(s));
    return {
      ...s,
      accumulatedStudyMs: studied,
      status: "paused" as const,
      pauseCount: s.pauseCount + 1,
      activePauseStartedAt: new Date(now).toISOString(),
      pauses: [
        ...s.pauses,
        {
          startedAt: new Date(now).toISOString(),
          endedAt: null,
          durationMs: null,
          reason,
        },
      ],
    };
  });
  const next = { ...state, sessions };
  saveDaySessions(next);
  return next;
}

export function resumeSession(
  state: DaySessionsState,
  sessionId: string,
): DaySessionsState {
  const now = Date.now();
  // Auto-pause any other active session
  let working = state;
  const otherActive = working.sessions.find(
    (s) => s.id !== sessionId && s.status === "active",
  );
  if (otherActive) {
    working = pauseSession(working, otherActive.id, "Switched session");
  }

  const sessions = working.sessions.map((s) => {
    if (s.id !== sessionId || s.status !== "paused") return s;
    const pauses = s.pauses.map((p, idx) => {
      if (idx !== s.pauses.length - 1 || p.endedAt) return p;
      const durationMs = now - new Date(p.startedAt).getTime();
      return {
        ...p,
        endedAt: new Date(now).toISOString(),
        durationMs,
      };
    });
    const addedPause = pauses[pauses.length - 1]?.durationMs ?? 0;
    return {
      ...s,
      status: "active" as const,
      activePauseStartedAt: null,
      pauseMs: s.pauseMs + addedPause,
      pauses,
    };
  });
  const next = { ...working, sessions };
  saveDaySessions(next);
  return next;
}

export function finishSession(
  state: DaySessionsState,
  sessionId: string,
  completionPercent: number,
  notesLearned: string,
  notesRemaining: string,
  extraNotes?: {
    quick?: string;
    doubt?: string;
    fact?: string;
    mistake?: string;
  },
): DaySessionsState {
  let working = state;
  const current = working.sessions.find((s) => s.id === sessionId);
  if (current?.status === "paused") {
    working = resumeSession(working, sessionId);
  }

  const now = Date.now();
  const sessions = working.sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const studied =
      s.status === "active"
        ? s.accumulatedStudyMs + Math.max(0, now - getSegmentStart(s))
        : s.accumulatedStudyMs;
    return {
      ...s,
      accumulatedStudyMs: studied,
      endedAt: new Date(now).toISOString(),
      status: "completed" as const,
      completionPercent,
      notesLearned,
      notesRemaining,
      notesQuick: extraNotes?.quick ?? s.notesQuick ?? "",
      notesDoubt: extraNotes?.doubt ?? s.notesDoubt ?? "",
      notesFact: extraNotes?.fact ?? s.notesFact ?? "",
      notesMistake: extraNotes?.mistake ?? s.notesMistake ?? "",
      activePauseStartedAt: null,
    };
  });

  const next: DaySessionsState = { ...working, sessions };
  saveDaySessions(next);
  const finished = next.sessions.find((s) => s.id === sessionId);
  if (finished) archiveSession(finished);
  invalidateAnalyticsCache();
  return next;
}

export function skipSession(
  state: DaySessionsState,
  sessionId: string,
): DaySessionsState {
  let working = state;
  const current = working.sessions.find((s) => s.id === sessionId);
  if (current?.status === "paused") {
    working = resumeSession(working, sessionId);
  }

  const now = Date.now();
  const sessions = working.sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const studied =
      s.status === "active"
        ? s.accumulatedStudyMs + Math.max(0, now - getSegmentStart(s))
        : s.accumulatedStudyMs;
    return {
      ...s,
      accumulatedStudyMs: studied,
      endedAt: new Date(now).toISOString(),
      status: "skipped" as const,
      activePauseStartedAt: null,
    };
  });

  const next: DaySessionsState = { ...working, sessions };
  saveDaySessions(next);
  const skipped = next.sessions.find((s) => s.id === sessionId);
  if (skipped) archiveSession(skipped);
  invalidateAnalyticsCache();
  return next;
}

export { sessionKey };
