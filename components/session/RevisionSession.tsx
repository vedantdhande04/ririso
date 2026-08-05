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
  getRevisionForTodayByType,
  heartbeatRevisionTimer,
  liveRevisionMs,
  pauseRevisionTimer,
  resumeRevisionTimer,
  saveRevisionReflection,
  type LocalRevision,
} from "@/lib/revision-storage";
import { formatDuration } from "@/lib/session-storage";
import type { RevisionType } from "@/lib/supabase/types";

const TITLES: Record<string, string> = {
  same_day: "Same day revision",
  next_day: "Yesterday's revision",
  weekly: "Weekly revision",
  fifteen_day: "15 day revision",
  monthly: "Monthly revision",
};

export function RevisionSession() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get("type") ?? "same_day";
  const type = (
    ["same_day", "next_day", "weekly", "fifteen_day", "monthly"].includes(
      typeParam,
    )
      ? typeParam
      : "same_day"
  ) as RevisionType;

  const [revision, setRevision] = useState<LocalRevision | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sparkle, setSparkle] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let found = getRevisionForTodayByType(type);
      if (type === "same_day") {
        found = (await ensureSameDayRevision()) ?? found;
      }
      if (cancelled || !found) {
        if (!cancelled) {
          setRevision(null);
          setReady(true);
        }
        return;
      }
      if (found.completedAt) {
        setRevision(found);
        setReady(true);
        return;
      }
      // Persist start so Session tab / refresh can return here
      const running = beginRevisionTimer(found.id) ?? found;
      setRevision(running);
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [type]);

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
            No revision block for this type yet. Pledge today&apos;s plan first,
            or open Daily Revision from home anytime after pledging.
          </p>
          <Button className="mt-6" onClick={() => router.push("/session")}>
            Back to sessions
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
            Lovely work revisiting today&apos;s pages.
          </p>
          <Button className="mt-6" onClick={() => router.push("/session")}>
            Back to sessions
          </Button>
        </Card>
      </PageShell>
    );
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
          <p className="text-caption">{TITLES[type] ?? "Revision"}</p>
          <h1 className="text-greeting mt-2">Gently revisit</h1>
          {isPaused ? (
            <span className="mt-3 inline-block rounded-full bg-pastel-yellow/70 px-3 py-1 text-xs font-semibold text-charcoal">
              Paused — open Session anytime to resume
            </span>
          ) : null}
          <p
            className={`mt-8 font-display text-5xl font-semibold md:text-6xl ${
              isPaused ? "text-muted" : "text-pastel-green-deep"
            }`}
            aria-live="polite"
          >
            {formatDuration(elapsed)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isPaused ? (
              <Button onClick={onResume}>Resume</Button>
            ) : (
              <Button variant="secondary" onClick={onPause}>
                Pause
              </Button>
            )}
            <Button variant="selected" onClick={onFinish}>
              Finish revision <Sparkle show={sparkle} />
            </Button>
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
