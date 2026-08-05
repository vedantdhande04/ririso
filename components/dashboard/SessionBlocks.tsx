"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { shiftLabels } from "@/lib/copy";
import {
  beginSessionNavigation,
  formatDuration,
  liveElapsedMs,
  pauseSession,
  loadDaySessions,
  type StudySessionLocal,
} from "@/lib/session-storage";
import type { LocalRevision } from "@/lib/revision-storage";

type SessionBlocksProps = {
  sessions: StudySessionLocal[];
  revision: LocalRevision | null;
  onChanged?: () => void;
  onAddExtra?: () => void;
};

function statusLabel(status: StudySessionLocal["status"]) {
  switch (status) {
    case "pending":
      return "Ready";
    case "active":
      return "In progress";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "skipped":
      return "Skipped";
    default:
      return status;
  }
}

function statusClass(status: StudySessionLocal["status"]) {
  switch (status) {
    case "completed":
      return "bg-pastel-green/50 text-pastel-green-deep";
    case "active":
      return "bg-pastel-pink/60 text-charcoal";
    case "paused":
      return "bg-pastel-yellow/60 text-charcoal";
    case "skipped":
      return "bg-ivory text-muted";
    default:
      return "bg-warm-white text-muted border border-border-soft";
  }
}

export function SessionBlocks({
  sessions,
  revision,
  onChanged,
  onAddExtra,
}: SessionBlocksProps) {
  const router = useRouter();

  function openSession(id: string, mode: "start" | "open" | "resume" = "start") {
    const nav = beginSessionNavigation(id, mode);
    onChanged?.();
    router.push(nav.href);
  }

  function pause(id: string) {
    pauseSession(loadDaySessions(), id, "Break");
    onChanged?.();
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="text-quote">No study blocks yet for today.</p>
      ) : (
        sessions.map((session) => {
          const elapsed = liveElapsedMs(session);
          return (
            <div
              key={session.id}
              className={`rounded-[20px] border border-border-soft bg-ivory/60 p-4 ${
                session.status === "completed" ? "animate-slide-completed" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-caption">
                    {shiftLabels[session.shift] ?? session.shift}
                    {session.isExtra ? " · Added today" : ""}
                  </p>
                  <p className="font-display text-base font-semibold text-charcoal">
                    {session.subjectName}
                  </p>
                  <p className="text-caption truncate">{session.topicName}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(session.status)}`}
                >
                  {statusLabel(session.status)}
                </span>
              </div>

              {(session.status === "active" ||
                session.status === "paused" ||
                session.status === "completed") && (
                <p className="mt-2 text-sm font-medium text-pastel-green-deep">
                  {formatDuration(elapsed)} studied
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {session.status === "pending" ? (
                  <Button
                    className="!min-h-10 !px-4 !py-2 text-sm"
                    onClick={() => openSession(session.id, "start")}
                  >
                    Start
                  </Button>
                ) : null}
                {session.status === "active" ? (
                  <>
                    <Button
                      className="!min-h-10 !px-4 !py-2 text-sm"
                      onClick={() => openSession(session.id, "open")}
                    >
                      Open timer
                    </Button>
                    <Button
                      variant="secondary"
                      className="!min-h-10 !px-4 !py-2 text-sm"
                      onClick={() => pause(session.id)}
                    >
                      Pause
                    </Button>
                  </>
                ) : null}
                {session.status === "paused" ? (
                  <Button
                    className="!min-h-10 !px-4 !py-2 text-sm"
                    onClick={() => openSession(session.id, "open")}
                  >
                    Open paused
                  </Button>
                ) : null}
                {session.status === "skipped" ? (
                  <Button
                    variant="secondary"
                    className="!min-h-10 !px-4 !py-2 text-sm"
                    onClick={() => openSession(session.id, "open")}
                  >
                    Open
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <div
        className={`rounded-[20px] border border-border-soft p-4 ${
          revision?.completedAt
            ? "bg-pastel-green/30"
            : "bg-pastel-yellow/35"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-caption">Revision</p>
            <p className="font-display text-base font-semibold text-charcoal">
              Daily revision
            </p>
            <p className="text-caption">
              {revision?.completedAt
                ? "Completed"
                : "Start anytime — no clock required"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              revision?.completedAt
                ? "bg-pastel-green/50 text-pastel-green-deep"
                : "bg-warm-white text-muted border border-border-soft"
            }`}
          >
            {revision?.completedAt ? "Completed" : "Ready"}
          </span>
        </div>
        {!revision?.completedAt ? (
          <Link
            href="/revision?type=same_day"
            className="touch-target mt-3 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-4 py-2 text-sm font-semibold text-charcoal"
          >
            {revision ? "Start / resume revision" : "Open revision"}
          </Link>
        ) : null}
      </div>

      {onAddExtra ? (
        <Button variant="secondary" className="w-full" onClick={onAddExtra}>
          Add extra session
        </Button>
      ) : null}
    </div>
  );
}
