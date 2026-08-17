"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getStudyDayKey } from "@/lib/date";
import {
  ensureSameDayRevision,
  getOpenRevision,
  getTodayRevisionTodos,
  getUpcomingRevisions,
  liveRevisionMs,
  revisionDisplayTitle,
  revisionHref,
  revisionLabels,
  type LocalRevision,
} from "@/lib/revision-storage";
import { formatDuration } from "@/lib/session-storage";

function statusLabel(r: LocalRevision): string {
  if (r.completedAt) return "Completed";
  if (r.runStatus === "active") return "Live";
  if (r.runStatus === "paused") return "Paused";
  return "Ready";
}

function RevisionRow({ revision }: { revision: LocalRevision }) {
  const done = Boolean(revision.completedAt);
  const open =
    !done &&
    (revision.runStatus === "active" || revision.runStatus === "paused");
  const href = revisionHref(revision.revisionType, revision.id);

  return (
    <div
      className={`rounded-[18px] border border-border-soft p-4 ${
        done
          ? "bg-pastel-green/25"
          : open
            ? "bg-pastel-pink/25"
            : "bg-ivory/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption">{revision.scheduledFor}</p>
          <p className="font-display text-base font-semibold text-charcoal">
            {revisionDisplayTitle(revision)}
          </p>
          <p className="text-caption mt-1">
            {done
              ? `${formatDuration(revision.studyMs)} studied`
              : open
                ? `${formatDuration(liveRevisionMs(revision))} · ${statusLabel(revision)}`
                : revision.topicNames.slice(0, 3).join(" · ") ||
                  "Topics appear after study"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            done
              ? "bg-pastel-green/50 text-pastel-green-deep"
              : open
                ? "bg-pastel-yellow/70 text-charcoal"
                : "border border-border-soft bg-warm-white text-muted"
          }`}
        >
          {statusLabel(revision)}
        </span>
      </div>
      {!done ? (
        <Link
          href={href}
          className="touch-target mt-3 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-4 py-2 text-sm font-semibold text-charcoal"
        >
          {open ? "Open timer" : "Start"}
        </Link>
      ) : null}
    </div>
  );
}

export function RevisionsHub() {
  const [todos, setTodos] = useState<ReturnType<typeof getTodayRevisionTodos> | null>(
    null,
  );
  const [upcoming, setUpcoming] = useState<LocalRevision[]>([]);
  const [open, setOpen] = useState<LocalRevision | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      await ensureSameDayRevision();
      setTodos(getTodayRevisionTodos());
      setUpcoming(getUpcomingRevisions(10));
      setOpen(getOpenRevision());
    })();
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener("focus", onSync);
    window.addEventListener("ririso:sync-applied", onSync);
    window.addEventListener("ririso:sessions-changed", onSync);
    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("ririso:sync-applied", onSync);
      window.removeEventListener("ririso:sessions-changed", onSync);
    };
  }, [refresh]);

  const todayList: LocalRevision[] = [];
  if (todos?.yesterday) todayList.push(todos.yesterday);
  if (todos?.daily) todayList.push(todos.daily);
  if (todos?.weekly) todayList.push(todos.weekly);
  if (todos?.fifteen) todayList.push(todos.fifteen);
  if (todos?.monthly) todayList.push(todos.monthly);
  if (todos?.sessions.length) todayList.push(...todos.sessions);

  const upcomingOnly = upcoming.filter(
    (r) => r.scheduledFor > getStudyDayKey() || !todayList.some((t) => t.id === r.id),
  );

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">RIRISO</p>
        <h1 className="text-greeting mt-2">Revisions</h1>
        <p className="text-quote mt-3 max-w-xl">
          Yesterday&apos;s revisit, daily review, optional session overlooks,
          and longer cycles — all in one quiet place.
        </p>
      </header>

      {open ? (
        <Card className="mt-6" doodle={<Doodle name="star" size={28} />}>
          <p className="text-caption">In progress</p>
          <p className="font-display mt-1 text-lg font-semibold text-charcoal">
            {revisionDisplayTitle(open)}
          </p>
          <p className="text-caption mt-1">
            {formatDuration(liveRevisionMs(open))} · {statusLabel(open)}
          </p>
          <Link href={revisionHref(open.revisionType, open.id)}>
            <Button className="mt-4">Continue timer</Button>
          </Link>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card doodle={<Doodle name="book" size={30} />}>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Today
          </h2>
          <p className="text-caption mt-1">
            {getStudyDayKey()} · revision time counts as study
          </p>
          <div className="mt-4 space-y-3">
            {todayList.length === 0 ? (
              <p className="text-quote">
                No revision blocks for today yet — pledge and study first.
              </p>
            ) : (
              todayList.map((r) => <RevisionRow key={r.id} revision={r} />)
            )}
          </div>
        </Card>

        <Card doodle={<Doodle name="leaf" size={28} />}>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Upcoming
          </h2>
          <p className="text-caption mt-1">
            Scheduled revisits on your soft calendar
          </p>
          <div className="mt-4 space-y-3">
            {upcomingOnly.length === 0 ? (
              <p className="text-quote">Nothing queued beyond today.</p>
            ) : (
              upcomingOnly.map((r) => <RevisionRow key={r.id} revision={r} />)
            )}
          </div>
          <ul className="mt-6 space-y-1 border-t border-border-soft pt-4">
            {(
              Object.entries(revisionLabels) as [keyof typeof revisionLabels, string][]
            ).map(([key, label]) => (
              <li key={key} className="text-caption">
                <span className="font-semibold text-charcoal">{label}</span>
                {key === "session"
                  ? " — optional after each study block"
                  : key === "next_day"
                    ? " — yesterday’s notes, due today"
                    : key === "same_day"
                      ? " — end-of-day gentle review"
                      : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
