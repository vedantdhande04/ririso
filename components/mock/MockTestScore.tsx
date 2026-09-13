"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  formatMockPlanned,
  getMockTest,
  mockAccuracy,
  saveMockScores,
  type MockTestLocal,
} from "@/lib/mock-test-storage";
import { formatDuration } from "@/lib/session-storage";

function digitsOnly(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseCount(raw: string) {
  if (raw.trim() === "") return 0;
  return Number(raw) || 0;
}

function MockTestScoreInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [mock, setMock] = useState<MockTestLocal | null>(null);
  const [attemptedText, setAttemptedText] = useState("");
  const [correctText, setCorrectText] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) {
      setReady(true);
      return;
    }
    const found = getMockTest(id);
    setMock(found);
    if (found) {
      const attempted =
        found.attempted ?? (found.status === "completed" ? 0 : found.totalQuestions);
      const correct = found.correct ?? 0;
      setAttemptedText(found.status === "completed" ? String(attempted) : String(found.totalQuestions));
      setCorrectText(found.status === "completed" ? String(correct) : "");
    }
    setReady(true);
  }, [id]);

  const attempted = parseCount(attemptedText);
  const correct = parseCount(correctText);
  const incorrect = Math.max(0, attempted - correct);

  const previewAccuracy = useMemo(() => {
    if (attempted <= 0) return null;
    return Math.round((correct / attempted) * 100);
  }, [attempted, correct]);

  if (!ready) {
    return (
      <PageShell>
        <p className="text-caption">Loading scorecard…</p>
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

  const done = mock.status === "completed";

  function onSave() {
    if (!mock || saving) return;
    setSaving(true);
    const cappedAttempted = Math.min(
      Math.max(0, attempted),
      mock.totalQuestions,
    );
    const cappedCorrect = Math.min(Math.max(0, correct), cappedAttempted);
    const next = saveMockScores(mock.id, {
      attempted: cappedAttempted,
      correct: cappedCorrect,
      incorrect: Math.max(0, cappedAttempted - cappedCorrect),
    });
    if (next) setMock(next);
    setSaving(false);
  }

  return (
    <PageShell>
      <Card className="mx-auto max-w-lg" doodle={<Doodle name="star" size={30} />}>
        <p className="text-caption">
          {done ? "Mock result" : "How did the paper go?"}
        </p>
        <h1 className="text-greeting mt-2">{mock.subjectName}</h1>
        <p className="text-caption mt-2">
          Time used {formatDuration(mock.accumulatedMs)}
          {mock.plannedMinutes
            ? ` · planned ${formatMockPlanned(mock.plannedMinutes)}`
            : ""}
        </p>
        <p className="text-caption">
          Paper size {mock.totalQuestions} questions
        </p>

        {done ? (
          <div className="mt-8 space-y-3 rounded-[18px] border border-border-soft bg-pastel-green/20 p-4">
            <p className="font-display text-2xl font-semibold text-pastel-green-deep">
              {mock.correct}/{mock.attempted} correct
              {mockAccuracy(mock) != null ? ` · ${mockAccuracy(mock)}%` : ""}
            </p>
            <p className="text-caption">
              Incorrect {mock.incorrect} · Attempted {mock.attempted} of{" "}
              {mock.totalQuestions}
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/mocks")}>
              Back to mock history
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-charcoal">
              Questions attempted
              <Input
                className="mt-2"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={attemptedText}
                onChange={(e) => setAttemptedText(digitsOnly(e.target.value))}
              />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              Correct
              <Input
                className="mt-2"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={correctText}
                onChange={(e) => setCorrectText(digitsOnly(e.target.value))}
              />
            </label>
            <p className="text-caption">
              Incorrect · {correct > attempted ? "—" : incorrect} (from attempted −
              correct)
            </p>
            {previewAccuracy != null && correct <= attempted ? (
              <p className="text-caption">Accuracy preview · {previewAccuracy}%</p>
            ) : null}
            {correct > attempted ? (
              <p className="text-sm text-pastel-pink-deep">
                Correct can’t be higher than attempted.
              </p>
            ) : null}
            <Button
              className="mt-4 w-full"
              disabled={
                saving ||
                attemptedText === "" ||
                correctText === "" ||
                correct > attempted ||
                attempted > mock.totalQuestions
              }
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save scores"}
            </Button>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

export function MockTestScore() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-caption">Loading scorecard…</p>
        </PageShell>
      }
    >
      <MockTestScoreInner />
    </Suspense>
  );
}
