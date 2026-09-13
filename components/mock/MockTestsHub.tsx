"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  formatMockPlanned,
  getOpenMockTest,
  listMockTests,
  mockHref,
  mockScoreSummary,
  type MockTestLocal,
} from "@/lib/mock-test-storage";
import { formatDuration } from "@/lib/session-storage";

function statusLabel(m: MockTestLocal) {
  switch (m.status) {
    case "active":
      return "Live";
    case "paused":
      return "Paused";
    case "awaiting_score":
      return "Enter score";
    case "completed":
      return "Done";
    default:
      return "Ready";
  }
}

function MockRow({ mock }: { mock: MockTestLocal }) {
  const done = mock.status === "completed";
  const open =
    mock.status === "active" ||
    mock.status === "paused" ||
    mock.status === "awaiting_score";
  const href =
    mock.status === "awaiting_score"
      ? mockHref(mock.id, "score")
      : mock.status === "completed"
        ? mockHref(mock.id, "score")
        : mockHref(mock.id, "run");

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
          <p className="text-caption">
            {mock.createdAt.slice(0, 10)} · {formatMockPlanned(mock.plannedMinutes)}
          </p>
          <p className="font-display text-base font-semibold text-charcoal">
            {mock.subjectName}
          </p>
          {mock.topics ? (
            <p className="text-caption mt-0.5 truncate">{mock.topics}</p>
          ) : null}
          <p className="text-caption mt-1">
            {done
              ? mockScoreSummary(mock)
              : open
                ? `${formatDuration(mock.accumulatedMs)} elapsed · ${mock.totalQuestions} Qs`
                : `${mock.totalQuestions} questions`}
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
          {statusLabel(mock)}
        </span>
      </div>
      <Link
        href={href}
        className="touch-target mt-3 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-pastel-pink px-4 py-2 text-sm font-semibold text-charcoal"
      >
        {done
          ? "View"
          : mock.status === "awaiting_score"
            ? "Enter scores"
            : open
              ? "Open timer"
              : "Continue"}
      </Link>
    </div>
  );
}

export function MockTestsHub() {
  const router = useRouter();
  const [mocks, setMocks] = useState<MockTestLocal[]>([]);
  const [open, setOpen] = useState<MockTestLocal | null>(null);

  const refresh = useCallback(() => {
    setMocks(listMockTests());
    setOpen(getOpenMockTest());
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

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">RIRISO</p>
        <h1 className="text-greeting mt-2">Mock tests</h1>
        <p className="text-quote mt-3 max-w-xl">
          Timed practice with a soft scorecard — subject, time, and results stay
          with you.
        </p>
      </header>

      <div className="mt-6">
        <Button className="w-full md:w-auto" onClick={() => router.push("/mocks/new")}>
          New mock test
        </Button>
      </div>

      {open ? (
        <Card className="mt-6" doodle={<Doodle name="star" size={28} />}>
          <p className="text-caption">In progress</p>
          <p className="font-display mt-1 text-lg font-semibold text-charcoal">
            {open.subjectName}
          </p>
          <p className="text-caption mt-1">
            {statusLabel(open)} · {formatDuration(open.accumulatedMs)}
          </p>
          <Link
            href={
              open.status === "awaiting_score"
                ? mockHref(open.id, "score")
                : mockHref(open.id, "run")
            }
          >
            <Button className="mt-4">
              {open.status === "awaiting_score" ? "Enter scores" : "Continue timer"}
            </Button>
          </Link>
        </Card>
      ) : null}

      <Card className="mt-8" doodle={<Doodle name="book" size={30} />}>
        <h2 className="font-display text-lg font-semibold text-charcoal">
          Previous mocks
        </h2>
        <p className="text-caption mt-1">Scores, time, and accuracy</p>
        <div className="mt-4 space-y-3">
          {mocks.length === 0 ? (
            <p className="text-quote">
              No mock tests yet — start one when you&apos;re ready.
            </p>
          ) : (
            mocks.map((m) => <MockRow key={m.id} mock={m} />)
          )}
        </div>
      </Card>
    </PageShell>
  );
}
