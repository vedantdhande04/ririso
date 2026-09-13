"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  finishMockTimer,
  formatMockPlanned,
  getMockTest,
  liveMockElapsedMs,
  liveMockRemainingMs,
  pauseMockTest,
  resumeMockTest,
  startMockTest,
  type MockTestLocal,
} from "@/lib/mock-test-storage";
import { formatDuration } from "@/lib/session-storage";

function MockTestTimerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [mock, setMock] = useState<MockTestLocal | null>(null);
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!id) {
      setMock(null);
      setReady(true);
      return;
    }
    let found = getMockTest(id);
    if (found?.status === "setup") {
      found = startMockTest(id);
    }
    setMock(found);
    setReady(true);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!mock || mock.status !== "active") return;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [mock?.id, mock?.status]);

  useEffect(() => {
    if (!mock || mock.status !== "active") return;
    if (liveMockRemainingMs(mock, now) > 0) return;
    const finished = finishMockTimer(mock.id);
    if (finished) {
      setMock(finished);
      router.replace(`/mocks/score?id=${encodeURIComponent(mock.id)}`);
    }
  }, [mock, now, router]);

  useEffect(() => {
    if (!mock) return;
    if (mock.status === "awaiting_score" || mock.status === "completed") {
      router.replace(`/mocks/score?id=${encodeURIComponent(mock.id)}`);
    }
  }, [mock, router]);

  if (!ready) {
    return (
      <PageShell>
        <p className="text-caption">Opening mock…</p>
      </PageShell>
    );
  }

  if (!mock) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-greeting">Mock not found</h1>
          <Button className="mt-6" onClick={() => router.push("/mocks")}>
            Back to mocks
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (mock.status === "awaiting_score" || mock.status === "completed") {
    return (
      <PageShell>
        <p className="text-caption">Opening scorecard…</p>
      </PageShell>
    );
  }

  const elapsed = liveMockElapsedMs(mock, now);
  const remaining = liveMockRemainingMs(mock, now);
  const isPaused = mock.status === "paused";
  const overtime = remaining <= 0;

  return (
    <PageShell>
      <Card
        className="mx-auto max-w-lg text-center md:min-h-[55vh]"
        doodle={<Doodle name="mug" size={32} />}
      >
        <p className="text-caption">Mock test</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-charcoal">
          {mock.subjectName}
        </h1>
        {mock.topics ? (
          <p className="text-quote mt-1">{mock.topics}</p>
        ) : null}
        <p className="text-caption mt-2">
          {mock.totalQuestions} questions · planned{" "}
          {formatMockPlanned(mock.plannedMinutes)}
        </p>

        {isPaused ? (
          <span className="mt-4 inline-block rounded-full bg-pastel-yellow/70 px-3 py-1 text-xs font-semibold text-charcoal">
            Paused
          </span>
        ) : null}

        <p className="text-caption mt-8">Time remaining</p>
        <p
          className={`mt-2 font-display text-5xl font-semibold tracking-tight md:text-6xl ${
            isPaused || overtime
              ? "text-muted"
              : remaining < 5 * 60_000
                ? "text-rose-600"
                : "text-pastel-green-deep"
          }`}
          aria-live="polite"
        >
          {formatDuration(remaining)}
        </p>
        <p className="text-caption mt-3">
          Elapsed {formatDuration(elapsed)}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isPaused ? (
            <Button
              className="w-full sm:w-40"
              onClick={() => {
                const next = resumeMockTest(mock.id);
                if (next) setMock(next);
              }}
            >
              Resume
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full sm:w-40"
              onClick={() => {
                const next = pauseMockTest(mock.id);
                if (next) setMock(next);
              }}
            >
              Pause
            </Button>
          )}
          <Button
            variant="selected"
            className="w-full sm:w-40"
            onClick={() => {
              const next = finishMockTimer(mock.id);
              if (next) {
                setMock(next);
                router.push(`/mocks/score?id=${encodeURIComponent(mock.id)}`);
              }
            }}
          >
            Finish
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}

export function MockTestTimer() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-caption">Opening mock…</p>
        </PageShell>
      }
    >
      <MockTestTimerInner />
    </Suspense>
  );
}
