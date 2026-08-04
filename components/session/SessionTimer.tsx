"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FinishSessionModal } from "@/components/session/FinishSessionModal";
import { PauseReasonPicker } from "@/components/session/PauseReasonPicker";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CapsuleProgress } from "@/components/ui/CapsuleProgress";
import { updateTopicProgress } from "@/lib/catalog";
import { celebrateDayComplete } from "@/lib/confetti";
import { timerNudge } from "@/lib/copy";
import { saveSessionNotes, type SessionNotes } from "@/lib/notes-storage";
import { schedulePostStudyRevisions } from "@/lib/revision-storage";
import {
  allQueueResolved,
  finishSession,
  formatDuration,
  getOrStartCurrentSession,
  liveElapsedMs,
  loadDaySessions,
  pauseSession,
  resetQueueFromPlan,
  resumeSession,
  skipSession,
  type DaySessionsState,
  type StudySessionLocal,
} from "@/lib/session-storage";
import {
  countActiveShifts,
  hasPledgedToday,
  loadTodayPlan,
} from "@/lib/planning-storage";

type GateMessage = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

export function SessionTimer() {
  const router = useRouter();
  const [state, setState] = useState<DaySessionsState | null>(null);
  const [session, setSession] = useState<StudySessionLocal | null>(null);
  const [gate, setGate] = useState<GateMessage | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showPauseReasons, setShowPauseReasons] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  const nudge = useMemo(
    () => timerNudge[Math.floor(Math.random() * timerNudge.length)],
    [],
  );

  useEffect(() => {
    const plan = loadTodayPlan();
    const active = countActiveShifts(plan);

    if (!hasPledgedToday()) {
      if (active > 0) {
        setGate({
          title: "A quiet promise first",
          body: "Your plan is ready — pledge to begin Session 1.",
          href: "/commit",
          cta: "Go to pledge",
        });
      } else {
        setGate({
          title: "Plan your day first",
          body: "Choose today's subjects and topics, then come back to study.",
          href: "/",
          cta: "Back home",
        });
      }
      return;
    }

    if (plan.status === "rest") {
      setGate({
        title: "Rest day",
        body: "No study sessions planned today — enjoy the quiet page.",
        href: "/calendar",
        cta: "Open planner",
      });
      return;
    }

    let day = loadDaySessions();
    if (day.queue.length === 0 && active > 0) {
      day = resetQueueFromPlan();
    }

    if (allQueueResolved(day) && day.queue.length > 0) {
      router.replace("/revision?type=same_day");
      return;
    }

    if (day.queue.length === 0) {
      setGate({
        title: "No sessions in the queue",
        body: "Your plan doesn't have topics yet. Add subjects and topics, then pledge again.",
        href: "/",
        cta: "Back home",
      });
      return;
    }

    const started = getOrStartCurrentSession(day);
    setState(started.state);
    setSession(started.session);
    setGate(null);

    if (!started.session) {
      setGate({
        title: "Couldn't start the timer",
        body: "Try opening the session again from home.",
        href: "/",
        cta: "Back home",
      });
    }
  }, [router]);

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session]);

  if (gate) {
    return (
      <PageShell>
        <Card className="max-w-lg">
          <h1 className="text-greeting">{gate.title}</h1>
          <p className="text-quote mt-3">{gate.body}</p>
          <Link
            href={gate.href}
            className="touch-target mt-6 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-5 py-3 text-sm font-semibold text-charcoal"
          >
            {gate.cta}
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (!state || !session) {
    return (
      <PageShell>
        <p className="text-caption">Preparing your session…</p>
      </PageShell>
    );
  }

  const elapsed = liveElapsedMs(session, now);
  const sessionNumber = state.currentIndex + 1;
  const total = state.queue.length;
  const progress = total === 0 ? 0 : ((sessionNumber - 1) / total) * 100;

  function onPause(reason: string | null) {
    if (!session || !state) return;
    const next = pauseSession(state, session.id, reason);
    setState(next);
    setSession(next.sessions.find((s) => s.id === session.id) ?? null);
    setShowPauseReasons(false);
  }

  function onResume() {
    if (!session || !state) return;
    const next = resumeSession(state, session.id);
    setState(next);
    setSession(next.sessions.find((s) => s.id === session.id) ?? null);
  }

  async function afterQueueStep(next: DaySessionsState) {
    if (allQueueResolved(next)) {
      celebrateDayComplete();
      await schedulePostStudyRevisions();
      router.push("/revision?type=same_day");
      return;
    }
    const started = getOrStartCurrentSession(next);
    setState(started.state);
    setSession(started.session);
  }

  async function onFinish(payload: {
    percent: number;
    learned: string;
    remaining: string;
    notes: SessionNotes;
  }) {
    if (!session || !state || saving) return;
    setSaving(true);
    try {
      const next = finishSession(
        state,
        session.id,
        payload.percent,
        payload.learned,
        payload.remaining,
        payload.notes,
      );
      setState(next);
      setShowFinish(false);

      try {
        await updateTopicProgress(session.topicId, payload.percent);
      } catch (err) {
        console.warn("Topic progress update failed", err);
      }

      await saveSessionNotes({
        sessionId: session.id,
        topicId: session.topicId,
        topicName: session.topicName,
        notes: payload.notes,
        learned: payload.learned,
        remaining: payload.remaining,
        planDate: session.planDate,
      });

      await afterQueueStep(next);
    } finally {
      setSaving(false);
    }
  }

  async function onSkip() {
    if (!session || !state || saving) return;
    setSaving(true);
    try {
      const next = skipSession(state, session.id);
      setState(next);
      await afterQueueStep(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell className="flex flex-1 flex-col">
      <Card className="flex flex-1 flex-col items-center text-center md:min-h-[70vh]">
        <p className="text-caption">
          Session {sessionNumber} of {total}
        </p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-charcoal md:text-3xl">
          {session.subjectName}
        </h1>
        <p className="text-quote mt-1">{session.topicName}</p>

        <p
          className="mt-10 font-display text-6xl font-semibold tracking-tight text-pastel-green-deep md:text-7xl"
          aria-live="polite"
        >
          {formatDuration(elapsed)}
        </p>

        <div className="mt-6">
          <CapsuleProgress value={progress + (total ? 100 / total / 2 : 0)} />
        </div>

        <p className="text-quote mt-8 max-w-sm">{nudge}</p>

        <div className="mt-auto flex w-full flex-col gap-3 pt-10 sm:flex-row sm:justify-center">
          {session.status === "active" ? (
            <Button
              variant="secondary"
              className="w-full sm:w-40"
              disabled={saving}
              onClick={() => setShowPauseReasons(true)}
            >
              Pause
            </Button>
          ) : (
            <Button className="w-full sm:w-40" disabled={saving} onClick={onResume}>
              Resume
            </Button>
          )}
          <Button
            variant="selected"
            className="w-full sm:w-40"
            disabled={saving}
            onClick={() => setShowFinish(true)}
          >
            Finish Session
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-40"
            disabled={saving}
            onClick={() => void onSkip()}
          >
            Skip for now
          </Button>
        </div>
      </Card>

      <PauseReasonPicker
        open={showPauseReasons}
        onCancel={() => setShowPauseReasons(false)}
        onSelect={onPause}
      />
      <FinishSessionModal
        open={showFinish}
        onCancel={() => setShowFinish(false)}
        onSave={(payload) => void onFinish(payload)}
      />
    </PageShell>
  );
}
