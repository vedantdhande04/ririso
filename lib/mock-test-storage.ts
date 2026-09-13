import { flushLocalState, notifyLocalDataChanged } from "@/lib/device-sync";
import { formatDuration } from "@/lib/session-storage";

export type MockTestStatus = "setup" | "active" | "paused" | "awaiting_score" | "completed";

export type MockTestLocal = {
  id: string;
  subjectName: string;
  topics: string;
  plannedMinutes: number;
  totalQuestions: number;
  status: MockTestStatus;
  startedAt: string | null;
  segmentStartedAt: string | null;
  accumulatedMs: number;
  endedAt: string | null;
  attempted: number | null;
  correct: number | null;
  incorrect: number | null;
  createdAt: string;
  lastMutatedAt: string;
};

const KEY = "ririso:mock-tests";

function loadAll(): MockTestLocal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockTestLocal[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: MockTestLocal[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  notifyLocalDataChanged();
  window.dispatchEvent(new Event("ririso:sessions-changed"));
  void flushLocalState();
}

function stamp() {
  return new Date().toISOString();
}

export function listMockTests(): MockTestLocal[] {
  return loadAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMockTest(id: string): MockTestLocal | null {
  return loadAll().find((m) => m.id === id) ?? null;
}

export function getOpenMockTest(): MockTestLocal | null {
  return (
    loadAll().find(
      (m) =>
        m.status === "active" ||
        m.status === "paused" ||
        m.status === "awaiting_score",
    ) ?? null
  );
}

export function mockHref(id?: string, view?: "run" | "score") {
  if (!id) return "/mocks";
  if (view === "score") return `/mocks/score?id=${encodeURIComponent(id)}`;
  if (view === "run") return `/mocks/run?id=${encodeURIComponent(id)}`;
  return `/mocks/run?id=${encodeURIComponent(id)}`;
}

export function createMockTest(input: {
  subjectName: string;
  topics: string;
  plannedMinutes: number;
  totalQuestions: number;
}): MockTestLocal {
  const now = stamp();
  const mock: MockTestLocal = {
    id: crypto.randomUUID(),
    subjectName: input.subjectName.trim(),
    topics: input.topics.trim(),
    plannedMinutes: Math.max(1, Math.round(input.plannedMinutes)),
    totalQuestions: Math.max(1, Math.round(input.totalQuestions)),
    status: "setup",
    startedAt: null,
    segmentStartedAt: null,
    accumulatedMs: 0,
    endedAt: null,
    attempted: null,
    correct: null,
    incorrect: null,
    createdAt: now,
    lastMutatedAt: now,
  };
  saveAll([mock, ...loadAll()]);
  return mock;
}

export function liveMockElapsedMs(mock: MockTestLocal, now = Date.now()) {
  if (mock.status === "active" && mock.segmentStartedAt) {
    return (
      mock.accumulatedMs +
      Math.max(0, now - new Date(mock.segmentStartedAt).getTime())
    );
  }
  return mock.accumulatedMs;
}

export function liveMockRemainingMs(mock: MockTestLocal, now = Date.now()) {
  const planned = mock.plannedMinutes * 60_000;
  return Math.max(0, planned - liveMockElapsedMs(mock, now));
}

function patch(id: string, update: Partial<MockTestLocal>): MockTestLocal | null {
  let updated: MockTestLocal | null = null;
  const all = loadAll().map((m) => {
    if (m.id !== id) return m;
    updated = { ...m, ...update, lastMutatedAt: stamp() };
    return updated;
  });
  if (!updated) return null;
  saveAll(all);
  return updated;
}

/** Start only from setup; leave paused alone. */
export function startMockTest(id: string): MockTestLocal | null {
  const current = getMockTest(id);
  if (!current) return null;
  if (current.status === "active") return current;
  if (current.status === "paused") return current;
  if (current.status !== "setup") return current;
  const now = stamp();
  return patch(id, {
    status: "active",
    startedAt: now,
    segmentStartedAt: now,
    accumulatedMs: 0,
  });
}

export function pauseMockTest(id: string): MockTestLocal | null {
  const current = getMockTest(id);
  if (!current || current.status !== "active") return current;
  return patch(id, {
    status: "paused",
    accumulatedMs: liveMockElapsedMs(current),
    segmentStartedAt: null,
  });
}

export function resumeMockTest(id: string): MockTestLocal | null {
  const current = getMockTest(id);
  if (!current || current.status !== "paused") return current;
  return patch(id, {
    status: "active",
    segmentStartedAt: stamp(),
  });
}

export function finishMockTimer(id: string): MockTestLocal | null {
  const current = getMockTest(id);
  if (!current) return null;
  if (current.status !== "active" && current.status !== "paused") {
    return current;
  }
  const elapsed =
    current.status === "active" ? liveMockElapsedMs(current) : current.accumulatedMs;
  return patch(id, {
    status: "awaiting_score",
    accumulatedMs: elapsed,
    segmentStartedAt: null,
    endedAt: stamp(),
  });
}

export function saveMockScores(
  id: string,
  input: { attempted: number; correct: number; incorrect: number },
): MockTestLocal | null {
  const current = getMockTest(id);
  if (!current) return null;
  return patch(id, {
    status: "completed",
    attempted: Math.max(0, Math.round(input.attempted)),
    correct: Math.max(0, Math.round(input.correct)),
    incorrect: Math.max(0, Math.round(input.incorrect)),
    endedAt: current.endedAt ?? stamp(),
    segmentStartedAt: null,
  });
}

export function formatMockPlanned(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function mockAccuracy(mock: MockTestLocal): number | null {
  if (mock.correct == null || mock.attempted == null || mock.attempted <= 0) {
    return null;
  }
  return Math.round((mock.correct / mock.attempted) * 100);
}

export function mockScoreSummary(mock: MockTestLocal) {
  if (mock.status !== "completed") return "—";
  const acc = mockAccuracy(mock);
  return `${mock.correct ?? 0}/${mock.attempted ?? 0} correct${
    acc != null ? ` · ${acc}%` : ""
  } · ${formatDuration(mock.accumulatedMs)}`;
}
