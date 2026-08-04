"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ExtraSessionModal } from "@/components/planning/ExtraSessionModal";
import { SessionBlocks } from "@/components/dashboard/SessionBlocks";
import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import {
  greet,
  pickMomentLine,
  supportive,
  type HomeMoment,
} from "@/lib/copy";
import {
  countActiveShifts,
  hasPledgedToday,
  loadTodayPlan,
} from "@/lib/planning-storage";
import {
  ensureSameDayRevision,
  getNextDayRevisionForToday,
  getSameDayRevision,
  getUpcomingAlerts,
  type LocalRevision,
} from "@/lib/revision-storage";
import {
  allStudyBlocksResolved,
  formatDuration,
  listSessionBlocks,
  liveElapsedMs,
  loadDaySessions,
  sessionHref,
  type StudySessionLocal,
} from "@/lib/session-storage";

function detectMoment(input: {
  pledged: boolean;
  rest: boolean;
  sessions: StudySessionLocal[];
  revision: LocalRevision | null;
}): HomeMoment {
  if (input.rest) return "rest_day";
  if (!input.pledged) {
    const plan = loadTodayPlan();
    return countActiveShifts(plan) > 0 ? "ready_to_pledge" : "not_planned";
  }

  const study = input.sessions;
  const completed = study.filter((s) => s.status === "completed");
  const resolved = study.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  );
  const pendingLike = study.filter(
    (s) =>
      s.status === "pending" || s.status === "active" || s.status === "paused",
  );
  const revisionDone = Boolean(input.revision?.completedAt);
  const allStudyDone = study.length > 0 && allStudyBlocksResolved({
    planDate: study[0]?.planDate ?? "",
    sessions: study,
  });

  if (allStudyDone && revisionDone) return "day_complete";
  if (allStudyDone && !revisionDone) return "all_study_done_revision_left";
  if (
    input.revision &&
    !revisionDone &&
    study.some((s) => s.status === "completed") &&
    pendingLike.length === 0
  ) {
    return "all_study_done_revision_left";
  }

  if (resolved.length === 0) return "no_sessions_started";
  if (completed.length === 1 && pendingLike.length > 0) return "first_session_done";
  if (pendingLike.length === 1) return "one_session_left";
  if (pendingLike.length > 0) return "mid_day_progress";
  return "mid_day_progress";
}

export function HomeDashboard() {
  const [pledged, setPledged] = useState(false);
  const [hoursLabel, setHoursLabel] = useState("0:00");
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sessions, setSessions] = useState<StudySessionLocal[]>([]);
  const [revision, setRevision] = useState<LocalRevision | null>(null);
  const [alerts, setAlerts] = useState<Array<{ date: string; label: string }>>(
    [],
  );
  const [yesterdayRevision, setYesterdayRevision] = useState(false);
  const [momentLine, setMomentLine] = useState<string>(supportive.emptyToday);
  const [cta, setCta] = useState<{ href: string; label: string } | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [rest, setRest] = useState(false);

  const refresh = useCallback(() => {
    void (async () => {
      const plan = loadTodayPlan();
      const pledgedToday = hasPledgedToday();
      setPledged(pledgedToday);
      setRest(plan.status === "rest");

      const day = loadDaySessions();
      const blocks = listSessionBlocks(day);
      setSessions(blocks);

      const completed = blocks.filter((s) => s.status === "completed");
      const skipped = blocks.filter((s) => s.status === "skipped");
      const total = Math.max(blocks.length, 1);
      const resolved = completed.length + skipped.length;
      setProgress(Math.round((resolved / total) * 100));
      setRemainingSessions(Math.max(blocks.length - resolved, 0));

      const studiedMs = blocks.reduce((sum, s) => {
        if (s.status === "pending") return sum;
        return sum + liveElapsedMs(s);
      }, 0);
      setHoursLabel(formatDuration(studiedMs));

      let sameDay = getSameDayRevision();
      if (pledgedToday && plan.status !== "rest") {
        sameDay = await ensureSameDayRevision();
      }
      setRevision(sameDay);

      setAlerts(
        getUpcomingAlerts(3).map((a) => ({ date: a.date, label: a.label })),
      );

      const nextDay = getNextDayRevisionForToday();
      setYesterdayRevision(Boolean(nextDay && !nextDay.completedAt));

      const current = blocks.find(
        (s) => s.status === "active" || s.status === "paused",
      );
      const moment = detectMoment({
        pledged: pledgedToday,
        rest: plan.status === "rest",
        sessions: blocks,
        revision: sameDay,
      });
      setMomentLine(pickMomentLine(moment));

      if (!pledgedToday) {
        setCta(
          countActiveShifts(plan) > 0
            ? { href: "/commit", label: "Pledge and begin" }
            : null,
        );
      } else if (plan.status === "rest") {
        setCta({ href: "/calendar", label: "Browse your planner" });
      } else if (current) {
        setCta({
          href: sessionHref(current.id),
          label: current.status === "paused" ? "Resume session" : "Open timer",
        });
      } else if (
        allStudyBlocksResolved(day) &&
        sameDay &&
        !sameDay.completedAt
      ) {
        setCta({
          href: "/revision?type=same_day",
          label: "Start same-day revision",
        });
      } else if (sameDay?.completedAt && allStudyBlocksResolved(day)) {
        setCta({ href: "/analytics", label: "See today's gentle insights" });
      } else if (nextDay && !nextDay.completedAt) {
        setCta({
          href: "/revision?type=next_day",
          label: "Start Yesterday's Revision",
        });
      } else {
        setCta(null);
      }
    })();
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">RIRISO</p>
        <h1 className="text-greeting mt-2">{greet()}</h1>
        <p className="text-quote mt-3 max-w-xl">{momentLine}</p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card doodle={<Doodle name="book" size={34} />}>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Today&apos;s sessions
          </h2>
          <p className="text-caption mt-1">
            Start, pause, and resume any block — in any order.
          </p>
          <div className="mt-5">
            {pledged && !rest ? (
              <SessionBlocks
                sessions={sessions}
                revision={revision}
                onChanged={refresh}
                onAddExtra={() => setShowExtra(true)}
              />
            ) : (
              <p className="text-quote">{supportive.emptyToday}</p>
            )}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="touch-target mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-5 py-3 text-sm font-semibold text-charcoal transition-transform hover:scale-[1.02] active:scale-[0.98] md:w-auto"
            >
              {cta.label}
            </Link>
          ) : null}
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
              Unlimited sessions — no time cap
            </p>
          </Card>
          <Card doodle={<Doodle name="leaf" size={28} />}>
            <p className="text-caption">Study streak</p>
            <p className="font-display mt-1 text-2xl font-semibold text-charcoal">
              {pledged ? "1 day" : "—"}
            </p>
            <p className="text-caption mt-2">{supportive.streakAlive}</p>
          </Card>
          <Card>
            <p className="text-caption">Calendar alerts</p>
            {yesterdayRevision ? (
              <Link
                href="/revision?type=next_day"
                className="mt-2 block text-sm font-semibold text-pastel-green-deep"
              >
                {supportive.revisionPending}
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

      <ExtraSessionModal
        open={showExtra}
        onClose={() => setShowExtra(false)}
        onAdded={refresh}
      />
    </PageShell>
  );
}
