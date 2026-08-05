"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { FinishSessionModal } from "@/components/session/FinishSessionModal";
import { PauseReasonPicker } from "@/components/session/PauseReasonPicker";
import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CapsuleProgress } from "@/components/ui/CapsuleProgress";
import { updateTopicProgress } from "@/lib/catalog";
import { celebrateDayComplete } from "@/lib/confetti";
import { shiftLabels, timerNudge } from "@/lib/copy";
import { saveSessionNotes, type SessionNotes } from "@/lib/notes-storage";
import { schedulePostStudyRevisions } from "@/lib/revision-storage";
import {
  allStudyBlocksResolved,
  beginSessionNavigation,
  finishSession,
  formatDuration,
  getOpenSession,
  getSessionById,
  listSessionBlocks,
  liveElapsedMs,
  loadDaySessions,
  loadSessionForView,
  pauseSession,
  resumeSession,
  sessionHref,
  skipSession,
  startSession,
  type DaySessionsState,
  type StudySessionLocal,
} from "@/lib/session-storage";
import {
  countActiveShifts,
  hasPledgedToday,
  loadTodayPlan,
} from "@/lib/planning-storage";
import { syncEvents } from "@/lib/device-sync";

type GateMessage = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

function SessionTimerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("id");

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

  const boot = useCallback(() => {
    const plan = loadTodayPlan();
    const activeCount = countActiveShifts(plan);

    if (!hasPledgedToday()) {
      setGate({
        title: activeCount > 0 ? "A quiet promise first" : "Plan your day first",
        body:
          activeCount > 0
            ? "Your plan is ready — pledge to begin any session."
            : "Choose today's subjects and topics, then come back.",
        href: activeCount > 0 ? "/commit" : "/",
        cta: activeCount > 0 ? "Go to pledge" : "Back home",
      });
      setSession(null);
      setState(null);
      return;
    }

    if (plan.status === "rest") {
      setGate({
        title: "Rest day",
        body: "No study sessions planned today.",
        href: "/calendar",
        cta: "Open planner",
      });
      setSession(null);
      setState(null);
      return;
    }

    const day = loadDaySessions();
    const open = getOpenSession(day);

    // Prefer active in the URL; otherwise first paused — never auto-resume.
    if (!sessionId && open) {
      router.replace(sessionHref(open.id));
      return;
    }

    if (sessionId) {
      const existing = getSessionById(sessionId, day);
      if (!existing) {
        if (open) {
          router.replace(sessionHref(open.id));
          return;
        }
        setGate({
          title: "Session not found",
          body: "That block isn't in today's plan anymore.",
          href: "/",
          cta: "Back home",
        });
        return;
      }

      if (existing.status === "completed" || existing.status === "skipped") {
        setState(day);
        setSession(existing);
        setGate(null);
        return;
      }

      if (existing.status === "pending") {
        // Explicit navigation to a pending block starts it (auto-pauses any active).
        const started = startSession(day, sessionId);
        setState(started.state);
        setSession(started.session);
        setGate(null);
        return;
      }

      // active or paused — load only, never auto-resume
      const viewed = loadSessionForView(day, sessionId);
      setState(viewed.state);
      setSession(viewed.session);
      setGate(null);
      return;
    }

    // No open session — empty board still shows pending blocks via shell below
    setState(day);
    setSession(null);
    setGate(null);
  }, [sessionId, router]);

  useEffect(() => {
    boot();
  }, [boot]);

  // Re-read storage after tab switch — never change paused → active here
  useEffect(() => {
    function syncFromStorage() {
      setNow(Date.now());
      const day = loadDaySessions();
      setState(day);
      if (sessionId) {
        const latest = getSessionById(sessionId, day);
        if (latest) setSession(latest);
      } else {
        boot();
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") syncFromStorage();
    }
    window.addEventListener("focus", syncFromStorage);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("ririso:sessions-changed", syncFromStorage);
    window.addEventListener(syncEvents.syncApplied, boot);
    return () => {
      window.removeEventListener("focus", syncFromStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("ririso:sessions-changed", syncFromStorage);
      window.removeEventListener(syncEvents.syncApplied, boot);
    };
  }, [boot, sessionId]);

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session]);

  const pausedOthers = useMemo(() => {
    if (!state) return [];
    return listSessionBlocks(state).filter(
      (s) =>
        s.status === "paused" && (!session || s.id !== session.id),
    );
  }, [state, session]);

  const pendingOthers = useMemo(() => {
    if (!state) return [];
    return listSessionBlocks(state).filter(
      (s) =>
        s.status === "pending" && (!session || s.id !== session.id),
    );
  }, [state, session]);

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

  if (!state) {
    return (
      <PageShell>
        <p className="text-caption">Preparing your session…</p>
      </PageShell>
    );
  }

  const total = state.sessions.length;
  const doneCount = state.sessions.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const progress = total === 0 ? 0 : (doneCount / total) * 100;

  function selectOther(id: string, mode: "start" | "open") {
    const nav = beginSessionNavigation(id, mode);
    router.push(nav.href);
  }

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

  async function afterFinish(next: DaySessionsState) {
    if (allStudyBlocksResolved(next)) {
      celebrateDayComplete();
      await schedulePostStudyRevisions();
    }
    const stillOpen = getOpenSession(next);
    if (stillOpen) {
      router.replace(sessionHref(stillOpen.id));
      return;
    }
    router.push("/");
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

      await afterFinish(next);
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
      await afterFinish(next);
    } finally {
      setSaving(false);
    }
  }

  if (session && (session.status === "completed" || session.status === "skipped")) {
    return (
      <PageShell>
        <Card className="max-w-lg text-center">
          <h1 className="text-greeting">
            {session.status === "completed" ? "Session complete" : "Session skipped"}
          </h1>
          <p className="text-quote mt-3">
            {session.subjectName} · {session.topicName}
          </p>
          <p className="mt-4 text-pastel-green-deep font-semibold">
            {formatDuration(session.accumulatedStudyMs)} studied
          </p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            Back home
          </Button>
        </Card>
      </PageShell>
    );
  }

  const elapsed = session ? liveElapsedMs(session, now) : 0;
  const isPaused = session?.status === "paused";
  const isActive = session?.status === "active";

  return (
    <PageShell className="flex flex-1 flex-col">
      {session && (isActive || isPaused) ? (
        <Card
          className="flex flex-col items-center text-center md:min-h-[58vh]"
          doodle={<Doodle name="mug" size={32} />}
        >
          <p className="text-caption">
            {doneCount} of {total} blocks done
            {isPaused ? " · paused — press Resume when ready" : " · running"}
          </p>
          <h1 className="font-display mt-3 text-2xl font-semibold text-charcoal md:text-3xl">
            {session.subjectName}
          </h1>
          <p className="text-quote mt-1">{session.topicName}</p>
          {isPaused ? (
            <span className="mt-3 rounded-full bg-pastel-yellow/70 px-3 py-1 text-xs font-semibold text-charcoal">
              Paused
            </span>
          ) : null}

          <p
            className={`mt-8 font-display text-6xl font-semibold tracking-tight md:text-7xl ${
              isPaused ? "text-muted" : "text-pastel-green-deep"
            }`}
            aria-live="polite"
          >
            {formatDuration(elapsed)}
          </p>

          <div className="mt-6">
            <CapsuleProgress value={progress} />
          </div>

          <p className="text-quote mt-8 max-w-sm">{nudge}</p>

          <div className="mt-auto flex w-full flex-col gap-3 pt-10 sm:flex-row sm:justify-center">
            {isActive ? (
              <Button
                variant="secondary"
                className="w-full sm:w-40"
                disabled={saving}
                onClick={() => setShowPauseReasons(true)}
              >
                Pause
              </Button>
            ) : (
              <Button
                className="w-full sm:w-40"
                disabled={saving}
                onClick={onResume}
              >
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
      ) : (
        <Card className="max-w-lg">
          <h1 className="text-greeting">Sessions today</h1>
          <p className="text-quote mt-3">
            Start any block. Pause one, start another — timers stay put until
            you resume.
          </p>
        </Card>
      )}

      {(pausedOthers.length > 0 || pendingOthers.length > 0) && (
        <div className="mt-4 space-y-3">
          {pausedOthers.length > 0 ? (
            <div>
              <p className="text-caption mb-2 font-semibold">Paused sessions</p>
              <ul className="space-y-2">
                {pausedOthers.map((block) => (
                  <li key={block.id}>
                    <button
                      type="button"
                      className="touch-target flex w-full items-center justify-between gap-3 rounded-[18px] border border-pastel-yellow/80 bg-pastel-yellow/35 px-4 py-3 text-left transition hover:scale-[1.01]"
                      onClick={() => selectOther(block.id, "open")}
                    >
                      <span className="min-w-0">
                        <span className="text-caption">
                          {shiftLabels[block.shift] ?? block.shift} · Paused
                        </span>
                        <span className="block truncate font-display font-semibold text-charcoal">
                          {block.subjectName}
                        </span>
                        <span className="text-caption truncate">
                          {block.topicName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-muted">
                        {formatDuration(liveElapsedMs(block))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendingOthers.length > 0 ? (
            <div>
              <p className="text-caption mb-2 font-semibold">Ready to start</p>
              <ul className="space-y-2">
                {pendingOthers.map((block) => (
                  <li key={block.id}>
                    <button
                      type="button"
                      className="touch-target flex w-full items-center justify-between gap-3 rounded-[18px] border border-border-soft bg-ivory/70 px-4 py-3 text-left transition hover:bg-pastel-pink/30"
                      onClick={() => selectOther(block.id, "start")}
                    >
                      <span className="min-w-0">
                        <span className="text-caption">
                          {shiftLabels[block.shift] ?? block.shift}
                        </span>
                        <span className="block truncate font-display font-semibold text-charcoal">
                          {block.subjectName}
                        </span>
                        <span className="text-caption truncate">
                          {block.topicName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-pastel-green-deep">
                        Start
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {session && (isActive || isPaused) ? (
        <>
          <PauseReasonPicker
            open={showPauseReasons}
            onCancel={() => setShowPauseReasons(false)}
            onSelect={onPause}
          />
          <FinishSessionModal
            open={showFinish}
            topicId={session.topicId}
            onCancel={() => setShowFinish(false)}
            onSave={(payload) => void onFinish(payload)}
          />
        </>
      ) : null}
    </PageShell>
  );
}

export function SessionTimer() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-caption">Preparing your session…</p>
        </PageShell>
      }
    >
      <SessionTimerInner />
    </Suspense>
  );
}
