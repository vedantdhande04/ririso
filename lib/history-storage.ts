import type { StudySessionLocal } from "@/lib/session-storage";

const HISTORY_KEY = "ririso:session-history";

export function loadSessionHistory(): StudySessionLocal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StudySessionLocal[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(sessions: StudySessionLocal[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
}

/** Upsert a finished/skipped session into durable history for analytics. */
export function archiveSession(session: StudySessionLocal) {
  if (session.status !== "completed" && session.status !== "skipped") return;
  const all = loadSessionHistory().filter((s) => s.id !== session.id);
  all.push(session);
  saveHistory(all);
}

export function sessionsForDate(planDate: string): StudySessionLocal[] {
  return loadSessionHistory().filter((s) => s.planDate === planDate);
}

export function allQueryableSessions(
  currentDaySessions: StudySessionLocal[] = [],
): StudySessionLocal[] {
  const history = loadSessionHistory();
  const byId = new Map<string, StudySessionLocal>();
  for (const s of history) byId.set(s.id, s);
  for (const s of currentDaySessions) {
    if (s.status === "completed" || s.status === "skipped") {
      byId.set(s.id, s);
    }
  }
  return [...byId.values()];
}
