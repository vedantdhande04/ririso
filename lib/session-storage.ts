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

export type StudySessionLocal = {
  id: string;
  planDate: string;
  shift: ShiftSlot;
  subjectName: string;
  topicId: string;
  topicName: string;
  startedAt: string;
  endedAt: string | null;
  accumulatedStudyMs: number;
  pauseMs: number;
  pauseCount: number;
  pauses: PauseRecord[];
  activePauseStartedAt: string | null;
  status: "active" | "paused" | "completed" | "skipped";
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
  queue: Array<{
    shift: ShiftSlot;
    subjectName: string;
    topicId: string;
    topicName: string;
  }>;
  currentIndex: number;
  sessions: StudySessionLocal[];
};

const KEY = "ririso:sessions";

function activeShiftsFromPlan(plan: DailyPlanLocal) {
  return (Object.entries(plan.shifts) as [ShiftSlot, ShiftSelection][])
    .filter(([, s]) => s.subjectName && s.subjectName !== "None" && s.topicId)
    .map(([shift, s]) => ({
      shift,
      subjectName: s.subjectName!,
      topicId: s.topicId!,
      topicName: s.topicName!,
    }));
}

export function emptyDaySessions(): DaySessionsState {
  return {
    planDate: getStudyDayKey(),
    queue: [],
    currentIndex: 0,
    sessions: [],
  };
}

export function loadDaySessions(): DaySessionsState {
  if (typeof window === "undefined") return emptyDaySessions();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return initFromPlan();
  try {
    const parsed = JSON.parse(raw) as DaySessionsState;
    if (parsed.planDate !== getStudyDayKey()) return initFromPlan();
    return parsed;
  } catch {
    return initFromPlan();
  }
}

export function saveDaySessions(state: DaySessionsState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function initFromPlan(): DaySessionsState {
  const plan = loadTodayPlan();
  const state: DaySessionsState = {
    planDate: getStudyDayKey(),
    queue: activeShiftsFromPlan(plan),
    currentIndex: 0,
    sessions: [],
  };
  saveDaySessions(state);
  return state;
}

export function getOrStartCurrentSession(
  state: DaySessionsState,
): { state: DaySessionsState; session: StudySessionLocal | null } {
  const item = state.queue[state.currentIndex];
  if (!item) return { state, session: null };

  const existing = state.sessions.find(
    (s) =>
      s.shift === item.shift &&
      s.topicId === item.topicId &&
      s.status !== "completed" &&
      s.status !== "skipped",
  );
  if (existing) return { state, session: existing };

  const session: StudySessionLocal = {
    id: crypto.randomUUID(),
    planDate: state.planDate,
    shift: item.shift,
    subjectName: item.subjectName,
    topicId: item.topicId,
    topicName: item.topicName,
    startedAt: new Date().toISOString(),
    endedAt: null,
    accumulatedStudyMs: 0,
    pauseMs: 0,
    pauseCount: 0,
    pauses: [],
    activePauseStartedAt: null,
    status: "active",
    completionPercent: null,
    notesLearned: "",
    notesRemaining: "",
    notesQuick: "",
    notesDoubt: "",
    notesFact: "",
    notesMistake: "",
  };

  const next = { ...state, sessions: [...state.sessions, session] };
  saveDaySessions(next);
  return { state: next, session };
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
  if (session.status === "completed" || session.status === "skipped") {
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
  const lastEndedPause = [...session.pauses]
    .reverse()
    .find((p) => p.endedAt);
  if (lastEndedPause?.endedAt) return new Date(lastEndedPause.endedAt).getTime();
  return new Date(session.startedAt).getTime();
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
  const sessions = state.sessions.map((s) => {
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
  const next = { ...state, sessions };
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

  const next: DaySessionsState = {
    ...working,
    sessions,
    currentIndex: working.currentIndex + 1,
  };
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

  const next: DaySessionsState = {
    ...working,
    sessions,
    currentIndex: working.currentIndex + 1,
  };
  saveDaySessions(next);
  const skipped = next.sessions.find((s) => s.id === sessionId);
  if (skipped) archiveSession(skipped);
  invalidateAnalyticsCache();
  return next;
}

export function allQueueResolved(state: DaySessionsState): boolean {
  if (state.queue.length === 0) return false;
  return state.currentIndex >= state.queue.length;
}
