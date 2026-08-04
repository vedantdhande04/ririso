import { addDays, getStudyDayKey } from "@/lib/date";
import { allQueryableSessions } from "@/lib/history-storage";
import { loadAllNotes } from "@/lib/notes-storage";
import { getAllRevisions } from "@/lib/revision-storage";
import {
  formatDuration,
  loadDaySessions,
  type StudySessionLocal,
} from "@/lib/session-storage";

export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

export function focusRatio(studyMs: number, pauseMs: number): number {
  const total = studyMs + pauseMs;
  if (total <= 0) return 0;
  return studyMs / total;
}

export function hoursLabel(ms: number): string {
  return formatDuration(ms);
}

function startOfWeek(dateKey: string): string {
  const dow = new Date(`${dateKey}T12:00:00`).getDay();
  return addDays(dateKey, -dow);
}

function monthPrefix(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function sumStudy(sessions: StudySessionLocal[]) {
  return sessions.reduce((sum, s) => sum + (s.accumulatedStudyMs || 0), 0);
}

function sumPause(sessions: StudySessionLocal[]) {
  return sessions.reduce((sum, s) => sum + (s.pauseMs || 0), 0);
}

export type AnalyticsSnapshot = {
  computedAt: string;
  overview: {
    todayMs: number;
    weekMs: number;
    monthMs: number;
    lifetimeMs: number;
    currentStreak: number;
    longestStreak: number;
    avgSessionMs: number;
    avgBreakMs: number;
    topicsCompleted: number;
    revisionCompletionPct: number;
  };
  heatmap: Array<{ date: string; hours: number; ms: number }>;
  trend: Array<{ date: string; hours: number }>;
  bySubject: Array<{
    subject: string;
    ms: number;
    hours: number;
    sessions: number;
  }>;
  byTopic: Array<{
    topicId: string;
    topicName: string;
    subjectName: string;
    sessions: number;
    ms: number;
    lastPercent: number | null;
    daysActive: number;
    completionDate: string | null;
  }>;
  focus: { studyPct: number; pausePct: number; studyMs: number; pauseMs: number };
  productivity: {
    bestDay: string | null;
    bestDayMs: number;
    longestSessionMs: number;
    deepestFocusSessionMs: number;
    avgStartHour: number | null;
    avgEndHour: number | null;
    avgBreakMs: number;
  };
  consistency: {
    currentStreak: number;
    longestStreak: number;
    missedDays: number;
    perfectWeeks: number;
  };
  planning: {
    planned: number;
    completed: number;
    skipped: number;
    completionPct: number;
    plannedMs: number;
    actualMs: number;
  };
  revisions: {
    byType: Array<{ type: string; total: number; completed: number; studyMs: number }>;
    missed: number;
    totalStudyMs: number;
  };
  reflection: {
    words: Array<{ text: string; value: number }>;
    doubts: number;
    unfinishedTopics: number;
  };
  dayBlocks: Record<
    string,
    Array<{
      label: string;
      kind: "study" | "pause" | "revision";
      start: string;
      end: string | null;
      ms: number;
      subjectName?: string;
      topicName?: string;
    }>
  >;
  studyClock: Array<{ hour: number; studyMs: number; pauseMs: number }>;
  replayDays: string[];
};

function computeStreaks(activeDates: string[], asOf: string) {
  const set = new Set(activeDates);
  let current = 0;
  let cursor = asOf;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  const sorted = [...set].sort();
  for (let i = 0; i < sorted.length; i += 1) {
    if (i === 0 || sorted[i] === addDays(sorted[i - 1], 1)) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

function wordFreq(texts: string[]) {
  const stop = new Set([
    "the",
    "and",
    "a",
    "to",
    "of",
    "in",
    "i",
    "it",
    "for",
    "is",
    "was",
    "on",
    "with",
    "this",
    "that",
    "my",
    "me",
  ]);
  const map = new Map<string, number>();
  for (const text of texts) {
    for (const raw of text.toLowerCase().split(/[^a-zA-Z]+/)) {
      const w = raw.trim();
      if (w.length < 3 || stop.has(w)) continue;
      map.set(w, (map.get(w) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([text, value]) => ({ text, value }));
}

export function computeAnalytics(rangeDays = 90): AnalyticsSnapshot {
  const today = getStudyDayKey();
  const day = loadDaySessions();
  const sessions = allQueryableSessions(day.sessions);
  const revisions = getAllRevisions();
  const notes = typeof window !== "undefined" ? loadAllNotes() : [];

  const weekStart = startOfWeek(today);
  const month = monthPrefix(today);

  const todaySessions = sessions.filter((s) => s.planDate === today);
  const weekSessions = sessions.filter((s) => s.planDate >= weekStart);
  const monthSessions = sessions.filter((s) => s.planDate.startsWith(month));

  const byDate = new Map<string, number>();
  for (const s of sessions) {
    byDate.set(s.planDate, (byDate.get(s.planDate) ?? 0) + s.accumulatedStudyMs);
  }
  const activeDates = [...byDate.entries()]
    .filter(([, ms]) => ms > 0)
    .map(([d]) => d);
  const streaks = computeStreaks(activeDates, today);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const skippedSessions = sessions.filter((s) => s.status === "skipped");
  const avgSessionMs =
    completedSessions.length === 0
      ? 0
      : sumStudy(completedSessions) / completedSessions.length;
  const breaks = completedSessions.flatMap((s) =>
    s.pauses.filter((p) => p.durationMs != null).map((p) => p.durationMs!),
  );
  const avgBreakMs =
    breaks.length === 0 ? 0 : breaks.reduce((a, b) => a + b, 0) / breaks.length;

  const topicsCompleted = new Set(
    completedSessions
      .filter((s) => (s.completionPercent ?? 0) >= 100)
      .map((s) => s.topicId),
  ).size;

  const revTotal = revisions.length;
  const revDone = revisions.filter((r) => r.completedAt).length;

  const heatmapStart = addDays(today, -(rangeDays - 1));
  const heatmap: AnalyticsSnapshot["heatmap"] = [];
  for (let i = 0; i < rangeDays; i += 1) {
    const date = addDays(heatmapStart, i);
    const ms = byDate.get(date) ?? 0;
    heatmap.push({ date, ms, hours: Number(msToHours(ms).toFixed(2)) });
  }

  const trend = heatmap.map(({ date, hours }) => ({ date, hours }));

  const subjectMap = new Map<string, { ms: number; sessions: number }>();
  for (const s of completedSessions) {
    const cur = subjectMap.get(s.subjectName) ?? { ms: 0, sessions: 0 };
    cur.ms += s.accumulatedStudyMs;
    cur.sessions += 1;
    subjectMap.set(s.subjectName, cur);
  }
  const bySubject = [...subjectMap.entries()]
    .map(([subject, v]) => ({
      subject,
      ms: v.ms,
      hours: Number(msToHours(v.ms).toFixed(2)),
      sessions: v.sessions,
    }))
    .sort((a, b) => b.ms - a.ms);

  const topicMap = new Map<
    string,
    {
      topicName: string;
      subjectName: string;
      sessions: number;
      ms: number;
      lastPercent: number | null;
      days: Set<string>;
      completionDate: string | null;
    }
  >();
  for (const s of completedSessions) {
    const cur = topicMap.get(s.topicId) ?? {
      topicName: s.topicName,
      subjectName: s.subjectName,
      sessions: 0,
      ms: 0,
      lastPercent: null,
      days: new Set<string>(),
      completionDate: null,
    };
    cur.sessions += 1;
    cur.ms += s.accumulatedStudyMs;
    cur.lastPercent = s.completionPercent;
    cur.days.add(s.planDate);
    if ((s.completionPercent ?? 0) >= 100) {
      cur.completionDate = s.planDate;
    }
    topicMap.set(s.topicId, cur);
  }
  const byTopic = [...topicMap.entries()].map(([topicId, v]) => ({
    topicId,
    topicName: v.topicName,
    subjectName: v.subjectName,
    sessions: v.sessions,
    ms: v.ms,
    lastPercent: v.lastPercent,
    daysActive: v.days.size,
    completionDate: v.completionDate,
  }));

  const studyMs = sumStudy(sessions);
  const pauseMs = sumPause(sessions);
  const ratio = focusRatio(studyMs, pauseMs);

  let bestDay: string | null = null;
  let bestDayMs = 0;
  for (const [date, ms] of byDate) {
    if (ms > bestDayMs) {
      bestDayMs = ms;
      bestDay = date;
    }
  }

  let longestSessionMs = 0;
  let deepestFocusSessionMs = 0;
  const startHours: number[] = [];
  const endHours: number[] = [];
  for (const s of completedSessions) {
    longestSessionMs = Math.max(longestSessionMs, s.accumulatedStudyMs);
    const fr = focusRatio(s.accumulatedStudyMs, s.pauseMs);
    if (fr >= 0.85) {
      deepestFocusSessionMs = Math.max(deepestFocusSessionMs, s.accumulatedStudyMs);
    }
    startHours.push(new Date(s.startedAt).getHours() + new Date(s.startedAt).getMinutes() / 60);
    if (s.endedAt) {
      endHours.push(new Date(s.endedAt).getHours() + new Date(s.endedAt).getMinutes() / 60);
    }
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  // Missed days in last 30 with gaps between first and today
  const last30 = addDays(today, -29);
  let missedDays = 0;
  for (let i = 0; i < 30; i += 1) {
    const d = addDays(last30, i);
    if (!byDate.has(d) || (byDate.get(d) ?? 0) <= 0) missedDays += 1;
  }

  let perfectWeeks = 0;
  for (let w = 0; w < 8; w += 1) {
    const end = addDays(today, -w * 7);
    const start = startOfWeek(end);
    let ok = true;
    for (let i = 0; i < 7; i += 1) {
      const d = addDays(start, i);
      if (d > today) continue;
      if ((byDate.get(d) ?? 0) <= 0) ok = false;
    }
    if (ok) perfectWeeks += 1;
  }

  const planned = day.queue.length;
  const plannedMs = planned * 90 * 60 * 1000;

  const revByType = new Map<string, { total: number; completed: number; studyMs: number }>();
  for (const r of revisions) {
    const cur = revByType.get(r.revisionType) ?? {
      total: 0,
      completed: 0,
      studyMs: 0,
    };
    cur.total += 1;
    if (r.completedAt) {
      cur.completed += 1;
      cur.studyMs += r.studyMs;
    }
    revByType.set(r.revisionType, cur);
  }

  const dayBlocks: AnalyticsSnapshot["dayBlocks"] = {};
  for (const s of sessions) {
    const blocks = dayBlocks[s.planDate] ?? [];
    blocks.push({
      label: "Study",
      kind: "study",
      start: s.startedAt,
      end: s.endedAt,
      ms: s.accumulatedStudyMs,
      subjectName: s.subjectName,
      topicName: s.topicName,
    });
    for (const p of s.pauses) {
      if (!p.startedAt) continue;
      blocks.push({
        label: p.reason ?? "Pause",
        kind: "pause",
        start: p.startedAt,
        end: p.endedAt,
        ms: p.durationMs ?? 0,
      });
    }
    dayBlocks[s.planDate] = blocks.sort((a, b) => a.start.localeCompare(b.start));
  }
  for (const r of revisions.filter((x) => x.completedAt)) {
    const blocks = dayBlocks[r.scheduledFor] ?? [];
    blocks.push({
      label: `${r.revisionType} revision`,
      kind: "revision",
      start: r.completedAt!,
      end: r.completedAt,
      ms: r.studyMs,
    });
    dayBlocks[r.scheduledFor] = blocks;
  }

  const studyClock = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    studyMs: 0,
    pauseMs: 0,
  }));
  const monthSessionsForClock = sessions.filter((s) =>
    s.planDate.startsWith(month),
  );
  for (const s of monthSessionsForClock) {
    const h = new Date(s.startedAt).getHours();
    studyClock[h].studyMs += s.accumulatedStudyMs;
    studyClock[h].pauseMs += s.pauseMs;
  }

  const reflectionTexts = [
    ...notes.map((n) => n.body),
    ...completedSessions.flatMap((s) => [
      s.notesLearned,
      s.notesRemaining,
      s.notesDoubt,
      s.notesMistake,
    ]),
    ...revisions.map((r) => r.reflection),
  ].filter(Boolean);

  return {
    computedAt: new Date().toISOString(),
    overview: {
      todayMs: sumStudy(todaySessions),
      weekMs: sumStudy(weekSessions),
      monthMs: sumStudy(monthSessions),
      lifetimeMs: studyMs,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      avgSessionMs,
      avgBreakMs,
      topicsCompleted,
      revisionCompletionPct:
        revTotal === 0 ? 0 : Math.round((revDone / revTotal) * 100),
    },
    heatmap,
    trend,
    bySubject,
    byTopic,
    focus: {
      studyPct: Math.round(ratio * 100),
      pausePct: Math.round((1 - ratio) * 100),
      studyMs,
      pauseMs,
    },
    productivity: {
      bestDay,
      bestDayMs,
      longestSessionMs,
      deepestFocusSessionMs,
      avgStartHour: avg(startHours),
      avgEndHour: avg(endHours),
      avgBreakMs,
    },
    consistency: {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      missedDays,
      perfectWeeks,
    },
    planning: {
      planned,
      completed: todaySessions.filter((s) => s.status === "completed").length,
      skipped: todaySessions.filter((s) => s.status === "skipped").length,
      completionPct:
        planned === 0
          ? 0
          : Math.round(
              (todaySessions.filter((s) => s.status === "completed").length /
                planned) *
                100,
            ),
      plannedMs,
      actualMs: sumStudy(todaySessions),
    },
    revisions: {
      byType: [...revByType.entries()].map(([type, v]) => ({ type, ...v })),
      missed: revisions.filter((r) => !r.completedAt && r.scheduledFor < today)
        .length,
      totalStudyMs: revisions.reduce((sum, r) => sum + r.studyMs, 0),
    },
    reflection: {
      words: wordFreq(reflectionTexts),
      doubts: notes.filter((n) => n.noteType === "doubt").length,
      unfinishedTopics: byTopic.filter(
        (t) => (t.lastPercent ?? 0) < 100,
      ).length,
    },
    dayBlocks,
    studyClock,
    replayDays: [...byDate.keys()].sort().reverse(),
  };
}
