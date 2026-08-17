"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlowerCheckbox } from "@/components/ui/FlowerCheckbox";
import { Textarea } from "@/components/ui/Input";
import { Sparkle } from "@/components/ui/Sparkle";
import { addDays, getStudyDayKey } from "@/lib/date";
import { notesGroupedByTopic } from "@/lib/notes-storage";
import {
  beginRevisionTimer,
  completeRevision,
  ensureSameDayRevision,
  getRevisionById,
  getRevisionForTodayByType,
  heartbeatRevisionTimer,
  liveRevisionMs,
  pauseRevisionTimer,
  resumeRevisionTimer,
  revisionDisplayTitle,
  saveRevisionReflection,
  type LocalRevision,
} from "@/lib/revision-storage";
import { formatDuration } from "@/lib/session-storage";
import type { RevisionType } from "@/lib/supabase/types";

const KNOWN: RevisionType[] = [
  "session",
  "same_day",
  "next_day",
  "weekly",
  "fifteen_day",
  "monthly",
];

export function RevisionSession() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get("type") ?? "same_day";
  const idParam = params.get("id");
  const type = (
    KNOWN.includes(typeParam as RevisionType) ? typeParam : "same_day"
  ) as RevisionType;

  const [revision, setRevision] = useState<LocalRevision | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sparkle, setSparkle] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let found: LocalRevision | null = null;
      if (idParam) {
        found = getRevisionById(idParam);
      } else {
        found = getRevisionForTodayByType(type);
        if (!found && type === "same_day") {
          found = (await ensureSameDayRevision()) ?? found;
        }
      }
      if (cancelled) return;
      // Never auto-start or auto-resume — user must press Start / Resume
      setRevision(found);
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [type, idParam]);

  useEffect(() => {
    if (!revision || revision.completedAt || revision.runStatus !== "active") {
      return;
    }
    const revisionId = revision.id;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    const beat = window.setInterval(() => {
      const next = heartbeatRevisionTimer(revisionId);
      if (next) setRevision(next);
    }, 5_000);

    function onHide() {
      if (document.visibilityState === "hidden") {
        const next = heartbeatRevisionTimer(revisionId);
        if (next) setRevision(next);
      }
    }
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(beat);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [revision?.id, revision?.runStatus, revision?.completedAt]);

  const noteGroups = useMemo(() => {
    if (!revision) return [];
    const date =
      type === "next_day"
        ? (revision.rangeStart ?? addDays(getStudyDayKey(), -1))
        : (revision.rangeStart ?? revision.scheduledFor);
    return notesGroupedByTopic(date);
  }, [revision, type]);

  const elapsed = revision ? liveRevisionMs(revision, now) : 0;
  const isPaused = revision?.runStatus === "paused";
  const isActive = revision?.runStatus === "active";
  const isPending = revision?.runStatus === "pending" && !revision.completedAt;

  if (!ready) {
    return (
      <PageShell>
        <p className="text-caption">Opening revision…</p>
      </PageShell>
    );
  }

  if (!revision) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-greeting">Revision</h1>
          <p className="text-quote mt-3">
            No revision block for this type yet. Check the Revisions tab for
            today&apos;s list.
          </p>
          <Button className="mt-6" onClick={() => router.push("/revisions")}>
            Open Revisions
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (revision.completedAt) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-greeting">Revision complete</h1>
          <p className="text-quote mt-3">
            Lovely work revisiting —{" "}
            {formatDuration(revision.studyMs)} counted as study time.
          </p>
          <Button className="mt-6" onClick={() => router.push("/revisions")}>
            Back to Revisions
          </Button>
        </Card>
      </PageShell>
    );
  }

  function onStart() {
    if (!revision) return;
    const next = beginRevisionTimer(revision.id);
    if (next) setRevision(next);
  }

  function onPause() {
    if (!revision) return;
    const next = pauseRevisionTimer(revision.id);
    if (next) setRevision(next);
  }

  function onResume() {
    if (!revision) return;
    const next = resumeRevisionTimer(revision.id);
    if (next) setRevision(next);
  }

  function onFinish() {
    if (!revision) return;
    const studied = liveRevisionMs(revision);
    const current = revision;
    completeRevision(current.id, studied, current.reflection);
    setSparkle(true);
    setRevision({
      ...current,
      completedAt: new Date().toISOString(),
      studyMs: studied,
      runStatus: "pending",
      segmentStartedAt: null,
    });
  }

  return (
    <PageShell>
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card
          className="text-center md:min-h-[60vh]"
          doodle={<Doodle name="book" size={32} />}
        >
          <p className="text-caption">{revisionDisplayTitle(revision)}</p>
          <h1 className="text-greeting mt-2">Gently revisit</h1>
          {isPaused ? (
            <span className="mt-3 inline-block rounded-full bg-pastel-yellow/70 px-3 py-1 text-xs font-semibold text-charcoal">
              Paused — stays paused until you resume
            </span>
          ) : null}
          {isPending ? (
            <span className="mt-3 inline-block rounded-full border border-border-soft bg-warm-white px-3 py-1 text-xs font-semibold text-muted">
              Ready when you are
            </span>
          ) : null}
          <p
            className={`mt-8 font-display text-5xl font-semibold md:text-6xl ${
              isPaused || isPending ? "text-muted" : "text-pastel-green-deep"
            }`}
            aria-live="polite"
          >
            {formatDuration(elapsed)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isPending ? (
              <Button onClick={onStart}>Start revision</Button>
            ) : null}
            {isActive ? (
              <Button variant="secondary" onClick={onPause}>
                Pause
              </Button>
            ) : null}
            {isPaused ? <Button onClick={onResume}>Resume</Button> : null}
            {(isActive || isPaused) && (
              <Button variant="selected" onClick={onFinish}>
                Finish revision <Sparkle show={sparkle} />
              </Button>
            )}
          </div>
          <label className="mt-8 block text-left text-sm font-medium text-charcoal">
            Reflection
            <Textarea
              className="mt-2"
              value={revision.reflection}
              onChange={(e) => {
                const value = e.target.value;
                setRevision((prev) =>
                  prev ? { ...prev, reflection: value } : prev,
                );
                saveRevisionReflection(revision.id, value);
              }}
              placeholder="What felt clearer this time?"
            />
          </label>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Topics checklist
          </h2>
          <ul className="mt-4 space-y-2">
            {revision.topicNames.length === 0 ? (
              <li className="text-caption">No topics linked yet.</li>
            ) : (
              revision.topicNames.map((name) => (
                <li key={name}>
                  <FlowerCheckbox label={name} />
                </li>
              ))
            )}
          </ul>

          <h3 className="font-display mt-6 text-base font-semibold text-charcoal">
            Notes from study
          </h3>
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
            {noteGroups.length === 0 ? (
              <p className="text-caption">
                No notes captured for these topics yet.
              </p>
            ) : (
              noteGroups.map((group) => (
                <div
                  key={group.topicId}
                  className="rounded-[18px] border border-border-soft bg-paper p-3"
                >
                  <p className="text-sm font-semibold text-charcoal">
                    {group.topicName}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {group.notes.map((n) => (
                      <li key={n.id} className="text-caption">
                        <span className="font-medium capitalize">
                          {n.noteType}:
                        </span>{" "}
                        {n.body}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
