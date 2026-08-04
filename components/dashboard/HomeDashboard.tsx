"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { TodayTimeline } from "@/components/dashboard/TodayTimeline";
import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { greet, supportive } from "@/lib/copy";
import {
  countActiveShifts,
  hasPledgedToday,
  loadTodayPlan,
} from "@/lib/planning-storage";
import {
  getNextDayRevisionForToday,
  getSameDayRevision,
  getUpcomingAlerts,
} from "@/lib/revision-storage";
import {
  allQueueResolved,
  formatDuration,
  loadDaySessions,
  liveElapsedMs,
} from "@/lib/session-storage";

const PLANNED_MS_PER_SESSION = 90 * 60 * 1000;

export function HomeDashboard() {
  const [pledged, setPledged] = useState(false);
  const [hoursLabel, setHoursLabel] = useState("0:00");
  const [remainingHours, setRemainingHours] = useState("—");
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [progress, setProgress] = useState(0);
  const [alerts, setAlerts] = useState<
    Array<{ date: string; label: string }>
  >([]);
  const [yesterdayRevision, setYesterdayRevision] = useState(false);
  const [cta, setCta] = useState<{ href: string; label: string }>({
    href: "/session",
    label: "Start today's first session",
  });

  const quote = useMemo(() => supportive.keepGoing, []);

  useEffect(() => {
    const plan = loadTodayPlan();
    const pledgedToday = hasPledgedToday();
    setPledged(pledgedToday);

    const sessions = loadDaySessions();
    const completed = sessions.sessions.filter((s) => s.status === "completed");
    const skipped = sessions.sessions.filter((s) => s.status === "skipped");
    const total = Math.max(sessions.queue.length, countActiveShifts(plan), 1);
    const resolved = completed.length + skipped.length;
    setProgress(Math.round((resolved / total) * 100));
    setRemainingSessions(Math.max(sessions.queue.length - resolved, 0));

    const studiedMs = sessions.sessions.reduce((sum, s) => {
      if (s.status === "completed" || s.status === "skipped") {
        return sum + s.accumulatedStudyMs;
      }
      if (s.status === "active" || s.status === "paused") {
        return sum + liveElapsedMs(s);
      }
      return sum;
    }, 0);
    setHoursLabel(formatDuration(studiedMs));

    const plannedMs = sessions.queue.length * PLANNED_MS_PER_SESSION;
    const remainingMs = Math.max(plannedMs - studiedMs, 0);
    setRemainingHours(
      sessions.queue.length === 0 ? "—" : formatDuration(remainingMs),
    );

    setAlerts(
      getUpcomingAlerts(3).map((a) => ({ date: a.date, label: a.label })),
    );

    const nextDay = getNextDayRevisionForToday();
    setYesterdayRevision(Boolean(nextDay && !nextDay.completedAt));

    const current = sessions.sessions.find(
      (s) => s.status === "active" || s.status === "paused",
    );
    const sameDay = getSameDayRevision();

    if (!pledgedToday) {
      setCta({ href: "/", label: "Plan your day first" });
    } else if (plan.status === "rest") {
      setCta({ href: "/calendar", label: "Browse your planner" });
    } else if (current) {
      setCta({ href: "/session", label: "Resume session" });
    } else if (allQueueResolved(sessions) && sameDay && !sameDay.completedAt) {
      setCta({ href: "/revision?type=same_day", label: "Start same-day revision" });
    } else if (nextDay && !nextDay.completedAt) {
      setCta({
        href: "/revision?type=next_day",
        label: "Start Yesterday's Revision",
      });
    } else {
      setCta({ href: "/session", label: "Start / continue session" });
    }
  }, []);

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">RIRISO</p>
        <h1 className="text-greeting mt-2">{greet()}</h1>
        <p className="text-quote mt-3 max-w-xl">{supportive.readyFirst}</p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card doodle={<Doodle name="book" size={34} />}>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Today&apos;s timeline
          </h2>
          <div className="mt-5">
            <TodayTimeline />
          </div>
          {pledged ? (
            <Link
              href={cta.href}
              className="touch-target mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-5 py-3 text-sm font-semibold text-charcoal transition-transform hover:scale-[1.02] active:scale-[0.98] md:w-auto"
            >
              {cta.label}
            </Link>
          ) : (
            <p className="text-caption mt-6">{supportive.emptyToday}</p>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex items-center gap-4">
            <ProgressRing value={progress} />
            <div>
              <p className="text-caption">Daily progress</p>
              <p className="font-display text-xl font-semibold text-charcoal">
                {progress}%
              </p>
              <p className="text-caption mt-1">
                {remainingSessions} session
                {remainingSessions === 1 ? "" : "s"} remaining
              </p>
            </div>
          </Card>
          <Card>
            <p className="text-caption">Hours studied today</p>
            <p className="font-display mt-1 text-2xl font-semibold text-pastel-green-deep">
              {hoursLabel}
            </p>
            <p className="text-caption mt-2">
              Remaining planned · {remainingHours}
            </p>
            <p className="text-quote mt-3">{quote}</p>
          </Card>
          <Card doodle={<Doodle name="leaf" size={28} />}>
            <p className="text-caption">Study streak</p>
            <p className="font-display mt-1 text-2xl font-semibold text-charcoal">
              {pledged ? "1 day" : "—"}
            </p>
            <p className="text-caption mt-2">Keep the gentle chain going.</p>
          </Card>
          <Card>
            <p className="text-caption">Calendar alerts</p>
            {yesterdayRevision ? (
              <Link
                href="/revision?type=next_day"
                className="mt-2 block text-sm font-semibold text-pastel-green-deep"
              >
                Your notes from yesterday would love a quick revisit.
              </Link>
            ) : null}
            {alerts.length === 0 && !yesterdayRevision ? (
              <p className="text-quote mt-2">{supportive.calendarQuiet}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.map((a) => (
                  <li key={`${a.date}-${a.label}`} className="text-caption">
                    {a.date} · {a.label}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
