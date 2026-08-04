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
  getOrStartCurrentSession,
  getSessionById,
  listSessionBlocks,
  liveElapsedMs,
  loadDaySessions,
  pauseSession,
  resumeSession,
  sessionHref,
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

function SessionTimerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("id");

  const [state, setState] = useState<DaySessionsState | null>(null);
  const [session, setSession] = useState<StudySessionLocal | null>(null);
  const [gate, setGate] = useState<GateMessage | null>(null);
  const [picker, setPicker] = useState<StudySessionLocal[] | null>(null);
  const [blockPrompt, setBlockPrompt] = useState<string | null>(null);
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
    const active = countActiveShifts(plan);

    if (!hasPledgedToday()) {
      setGate({
        title: active > 0 ? "A quiet promise first" : "Plan your day first",
        body:
          active > 0
            ? "Your plan is ready — pledge to begin any session."
            : "Choose today's subjects and topics, then come back.",
        href: active > 0 ? "/commit" : "/",
        cta: active > 0 ? "Go to pledge" : "Back home",
      });
      setPicker(null);
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
      setPicker(null);
      setSession(null);
      setState(null);
      return;
    }

    const day = loadDaySessions();
    const open = getOpenSession(day);

    // Navbar / bare /session → resume the live block with a stable URL
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
        setPicker(null);
        return;
      }
      if (existing.status === "completed" || existing.status === "skipped") {
        setState(day);
        setSession(existing);
        setGate(null);
        setPicker(null);
        setBlockPrompt(null);
        return;
      }
      const started = getOrStartCurrentSession(day, sessionId);
      if (started.blockedById) {
        setState(started.state);
        setSession(getSessionById(sessionId, started.state));
        setBlockPrompt(started.blockedById);
        setGate(null);
        setPicker(null);
        return;
      }
      setState(started.state);
      setSession(started.session);
      setGate(null);
      setPicker(null);
      setBlockPrompt(null);
      return;
    }

    // No open session — show picker of today's blocks
    const blocks = listSessionBlocks(day).filter(
      (s) => s.status !== "completed" && s.status !== "skipped",
    );
    setState(day);
    setSession(null);
    setGate(null);
    setBlockPrompt(null);
    setPicker(blocks.length > 0 ? blocks : []);
  }, [sessionId, router]);

  useEffect(() => {
    boot();
  }, [boot]);

  // Keep wall-clock timer accurate after tab switch / browser reopen
  useEffect(() => {
    function syncFromStorage() {
      setNow(Date.now());
      if (!sessionId) {
        boot();
        return;
      }
      const day = loadDaySessions();
      const latest = getSessionById(sessionId, day);
      if (latest) {
        setState(day);
        setSession(latest);
      }
    }
    window.addEventListener("focus", syncFromStorage);
    document.addEventListener("visibilitychange", syncFromStorage);
    window.addEventListener("ririso:sessions-changed", syncFromStorage);
    return () => {
      window.removeEventListener("focus", syncFromStorage);
      document.removeEventListener("visibilitychange", syncFromStorage);
      window.removeEventListener("ririso:sessions-changed", syncFromStorage);
    };
  }, [boot, sessionId]);

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

  if (picker) {
    return (
      <PageShell>
        <Card className="max-w-lg">
          <h1 className="text-greeting">Choose a session</h1>
          <p className="text-quote mt-3">
            Start any block — your timer keeps running if you leave and come
            back.
          </p>
          {picker.length === 0 ? (
            <p className="text-caption mt-4">
              No open study blocks. Add one from home, or enjoy a quiet pause.
            </p>
          ) : (
            <ul className="mt-5 space-y-2">
              {picker.map((block) => (
                <li key={block.id}>
                  <button
                    type="button"
                    className="touch-target flex w-full flex-col rounded-[18px] border border-border-soft bg-ivory/70 px-4 py-3 text-left transition hover:bg-pastel-pink/30"
                    onClick={() => {
                      const nav = beginSessionNavigation(block.id);
                      router.push(nav.href);
                    }}
                  >
                    <span className="text-caption">
                      {shiftLabels[block.shift] ?? block.shift}
                      {block.status === "paused" ? " · Paused" : ""}
                    </span>
                    <span className="font-display font-semibold text-charcoal">
                      {block.subjectName}
                    </span>
                    <span className="text-caption truncate">{block.topicName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => router.push("/")}
          >
            Back home
          </Button>
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

  if (session.status === "pending" && blockPrompt) {
    return (
      <PageShell>
        <Card className="max-w-lg">
          <h1 className="text-greeting">Another session is running</h1>
          <p className="text-quote mt-3">
            Pause the active timer first, then start this block — or open the
            active one.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => router.push(sessionHref(blockPrompt))}>
              Open active session
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Back home
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const elapsed = liveElapsedMs(session, now);
  const total = state.sessions.length;
  const doneCount = state.sessions.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const progress = total === 0 ? 0 : (doneCount / total) * 100;

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

  if (session.status === "completed" || session.status === "skipped") {
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

  return (
    <PageShell className="flex flex-1 flex-col">
      <Card
        className="flex flex-1 flex-col items-center text-center md:min-h-[70vh]"
        doodle={<Doodle name="mug" size={32} />}
      >
        <p className="text-caption">
          {doneCount} of {total} blocks done · timer keeps running if you leave
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
          <CapsuleProgress value={progress} />
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
        topicId={session.topicId}
        onCancel={() => setShowFinish(false)}
        onSave={(payload) => void onFinish(payload)}
      />
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
