"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hoursLabel, type AnalyticsSnapshot } from "@/lib/analytics";
import { getAnalyticsSnapshot } from "@/lib/analytics-cache";

const GREENS = ["#E8F5EC", "#C9E6D1", "#B8D8C0", "#7FAD8C", "#5F8F6C"];
const SUBJECT_COLORS = [
  "#F3CFD8",
  "#B8D8C0",
  "#F5E6B8",
  "#DDD0EF",
  "#C9E6D1",
  "#E8D5C4",
  "#D4E5F7",
  "#F0D4C8",
];

type RangeKey = 7 | 30 | 60 | 90 | 0;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border-soft bg-ivory/60 p-3">
      <p className="text-caption">{label}</p>
      <p className="font-display mt-1 text-lg font-semibold text-charcoal">
        {value}
      </p>
    </div>
  );
}

function hourLabel(h: number | null) {
  if (h == null) return "—";
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [range, setRange] = useState<RangeKey>(30);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDeep, setShowDeep] = useState(false);
  const [replayDay, setReplayDay] = useState<string | null>(null);

  useEffect(() => {
    setData(getAnalyticsSnapshot(true));
  }, []);

  const trend = useMemo(() => {
    if (!data) return [];
    if (range === 0) return data.trend;
    return data.trend.slice(-range);
  }, [data, range]);

  const maxHeat = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.heatmap.map((h) => h.hours), 0.01);
  }, [data]);

  if (!data) {
    return (
      <PageShell>
        <p className="text-caption">Gathering your study story…</p>
      </PageShell>
    );
  }

  const dayBlocks = selectedDay ? (data.dayBlocks[selectedDay] ?? []) : [];
  const replayBlocks = replayDay ? (data.dayBlocks[replayDay] ?? []) : [];

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">Soft insights</p>
        <h1 className="text-greeting mt-1">Analytics</h1>
        <p className="text-quote mt-2 max-w-xl">
          A gentle look at how your study days bloom — never a report card.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today" value={hoursLabel(data.overview.todayMs)} />
        <Stat label="This week" value={hoursLabel(data.overview.weekMs)} />
        <Stat label="This month" value={hoursLabel(data.overview.monthMs)} />
        <Stat label="Lifetime" value={hoursLabel(data.overview.lifetimeMs)} />
        <Stat label="Current streak" value={`${data.overview.currentStreak}d`} />
        <Stat label="Longest streak" value={`${data.overview.longestStreak}d`} />
        <Stat
          label="Avg session"
          value={hoursLabel(data.overview.avgSessionMs)}
        />
        <Stat
          label="Revision done"
          value={`${data.overview.revisionCompletionPct}%`}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card doodle={<Doodle name="leaf" size={28} />}>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Study heatmap
          </h2>
          <p className="text-caption mt-1">Tap a day to expand its story.</p>
          <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
            {data.heatmap.slice(-84).map((day) => {
              const intensity = day.hours / maxHeat;
              const level =
                day.hours <= 0
                  ? 0
                  : intensity < 0.25
                    ? 1
                    : intensity < 0.5
                      ? 2
                      : intensity < 0.75
                        ? 3
                        : 4;
              return (
                <button
                  key={day.date}
                  type="button"
                  title={`${day.date}: ${day.hours}h`}
                  onClick={() => setSelectedDay(day.date)}
                  className={`aspect-square min-h-7 rounded-md border border-border-soft/60 transition hover:scale-105 ${
                    selectedDay === day.date ? "ring-2 ring-pastel-green-deep" : ""
                  }`}
                  style={{ backgroundColor: GREENS[level] }}
                />
              );
            })}
          </div>
          {selectedDay ? (
            <div className="mt-4 rounded-[18px] border border-border-soft bg-ivory/70 p-3">
              <p className="text-sm font-semibold text-charcoal">{selectedDay}</p>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {dayBlocks.length === 0 ? (
                  <li className="text-caption">A quiet day.</li>
                ) : (
                  dayBlocks.map((b, i) => (
                    <li key={`${b.start}-${i}`} className="text-caption">
                      <span
                        className={
                          b.kind === "study"
                            ? "text-pastel-green-deep"
                            : b.kind === "revision"
                              ? "text-pastel-lavender-deep"
                              : "text-muted"
                        }
                      >
                        {b.kind === "study" ? "████" : b.kind === "pause" ? "░░░░" : "····"}
                      </span>{" "}
                      {b.label}
                      {b.subjectName ? ` · ${b.subjectName}` : ""}
                      {b.topicName ? ` · ${b.topicName}` : ""} ·{" "}
                      {hoursLabel(b.ms)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Focus
          </h2>
          <p className="text-quote mt-2">
            Study {data.focus.studyPct}% · Break {data.focus.pausePct}%
          </p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Study", value: data.focus.studyMs || 1 },
                    { name: "Break", value: data.focus.pauseMs || 0.01 },
                  ]}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  <Cell fill="#7FAD8C" />
                  <Cell fill="#E5E0D8" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Study trend
            </h2>
            <div className="flex flex-wrap gap-2">
              {([7, 30, 60, 90, 0] as RangeKey[]).map((r) => (
                <Button
                  key={r}
                  variant={range === r ? "selected" : "secondary"}
                  className="!min-h-9 !px-3 !py-1.5 text-xs"
                  onClick={() => setRange(r)}
                >
                  {r === 0 ? "All" : `${r}d`}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#7a736c" }}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 10, fill: "#7a736c" }} width={28} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#7FAD8C"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Time by subject
          </h2>
          <div className="mt-4 h-56">
            {data.bySubject.length === 0 ? (
              <p className="text-caption">Complete a session to see this pie.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySubject}
                    dataKey="hours"
                    nameKey="subject"
                    outerRadius={80}
                  >
                    {data.bySubject.map((_, i) => (
                      <Cell
                        key={i}
                        fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-2 space-y-1">
            {data.bySubject.slice(0, 6).map((s) => (
              <li key={s.subject} className="text-caption flex justify-between">
                <span>{s.subject}</span>
                <span>{s.hours}h</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Productivity
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label="Best day"
              value={data.productivity.bestDay ?? "—"}
            />
            <Stat
              label="Best day hours"
              value={hoursLabel(data.productivity.bestDayMs)}
            />
            <Stat
              label="Longest session"
              value={hoursLabel(data.productivity.longestSessionMs)}
            />
            <Stat
              label="Deep focus"
              value={hoursLabel(data.productivity.deepestFocusSessionMs)}
            />
            <Stat
              label="Avg start"
              value={hourLabel(data.productivity.avgStartHour)}
            />
            <Stat
              label="Avg end"
              value={hourLabel(data.productivity.avgEndHour)}
            />
          </div>
        </Card>
      </section>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => setShowDeep((v) => !v)}>
          {showDeep ? "Hide deeper pages" : "Open deeper analytics"}
        </Button>
      </div>

      {showDeep ? (
        <div className="mt-6 space-y-4">
          <Card>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Topics
            </h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {data.byTopic.length === 0 ? (
                <p className="text-caption">Topics will appear after study.</p>
              ) : (
                data.byTopic.map((t) => (
                  <div
                    key={t.topicId}
                    className="rounded-[16px] border border-border-soft bg-ivory/50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-charcoal">
                      {t.topicName}
                    </p>
                    <p className="text-caption">
                      {t.subjectName} · {t.sessions} sessions ·{" "}
                      {hoursLabel(t.ms)} · {t.lastPercent ?? 0}% ·{" "}
                      {t.daysActive} days
                      {t.completionDate ? ` · done ${t.completionDate}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="font-display text-lg font-semibold text-charcoal">
                Consistency
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat
                  label="Missed (30d)"
                  value={`${data.consistency.missedDays}`}
                />
                <Stat
                  label="Perfect weeks"
                  value={`${data.consistency.perfectWeeks}`}
                />
              </div>
            </Card>
            <Card>
              <h2 className="font-display text-lg font-semibold text-charcoal">
                Planning accuracy (today)
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat label="Planned" value={`${data.planning.planned}`} />
                <Stat label="Completed" value={`${data.planning.completed}`} />
                <Stat label="Skipped" value={`${data.planning.skipped}`} />
                <Stat
                  label="Completion"
                  value={`${data.planning.completionPct}%`}
                />
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Revisions
            </h2>
            <ul className="mt-3 space-y-2">
              {data.revisions.byType.length === 0 ? (
                <li className="text-caption">No revisions yet.</li>
              ) : (
                data.revisions.byType.map((r) => (
                  <li key={r.type} className="text-caption flex justify-between">
                    <span className="capitalize">
                      {r.type.replaceAll("_", " ")}
                    </span>
                    <span>
                      {r.completed}/{r.total} · {hoursLabel(r.studyMs)}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="text-caption mt-2">
              Missed revisions · {data.revisions.missed}
            </p>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Reflection words
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.reflection.words.length === 0 ? (
                <p className="text-caption">Notes will gather into a soft cloud.</p>
              ) : (
                data.reflection.words.map((w) => (
                  <span
                    key={w.text}
                    className="rounded-full bg-pastel-lavender/50 px-3 py-1 text-sm text-charcoal"
                    style={{ fontSize: `${12 + Math.min(w.value, 8)}px` }}
                  >
                    {w.text}
                  </span>
                ))
              )}
            </div>
            <p className="text-caption mt-3">
              Doubts logged · {data.reflection.doubts} · Unfinished topics ·{" "}
              {data.reflection.unfinishedTopics}
            </p>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Study clock (this month)
            </h2>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
              {data.studyClock.map((h) => {
                const total = h.studyMs + h.pauseMs;
                const studyShare = total === 0 ? 0 : h.studyMs / total;
                return (
                  <div key={h.hour} className="text-center">
                    <div className="mx-auto flex h-16 w-8 flex-col justify-end overflow-hidden rounded-full bg-ivory">
                      <div
                        className="w-full bg-pastel-green-deep/80"
                        style={{ height: `${Math.max(studyShare * 100, total ? 8 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted">{h.hour}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-charcoal">
              Session replay
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.replayDays.slice(0, 12).map((d) => (
                <Button
                  key={d}
                  variant={replayDay === d ? "selected" : "secondary"}
                  className="!min-h-9 !px-3 !py-1.5 text-xs"
                  onClick={() => setReplayDay(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            {replayDay ? (
              <ol className="mt-4 max-h-64 space-y-2 overflow-y-auto border-l-2 border-border-soft pl-4">
                {replayBlocks.map((b, i) => (
                  <li key={`${b.start}-${i}`} className="text-caption">
                    <span className="font-semibold text-charcoal">
                      {new Date(b.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>{" "}
                    — {b.kind}: {b.label}
                    {b.topicName ? ` (${b.topicName})` : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-caption mt-3">
                Choose a day to replay start → pause → finish.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
