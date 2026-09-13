"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import {
  ADDITIONAL_SUBJECTS,
  MORNING_SUBJECTS,
  SECOND_SUBJECTS,
  THIRD_SUBJECTS,
} from "@/lib/constants";
import {
  createMockTest,
  formatMockPlanned,
  mockHref,
  startMockTest,
} from "@/lib/mock-test-storage";

const SUBJECT_OPTIONS = [
  ...new Set(
    [
      ...MORNING_SUBJECTS,
      ...SECOND_SUBJECTS,
      ...THIRD_SUBJECTS,
      ...ADDITIONAL_SUBJECTS,
    ].filter((s) => s !== "None"),
  ),
];

export function NewMockTestForm() {
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [saving, setSaving] = useState(false);

  const resolvedSubject = useMemo(() => {
    if (subjectName === "__custom__") return customSubject.trim();
    return subjectName.trim();
  }, [subjectName, customSubject]);

  const canStart =
    resolvedSubject.length > 0 &&
    minutes >= 5 &&
    totalQuestions >= 1 &&
    !saving;

  function onStart() {
    if (!canStart) return;
    setSaving(true);
    const mock = createMockTest({
      subjectName: resolvedSubject,
      topics,
      plannedMinutes: minutes,
      totalQuestions,
    });
    startMockTest(mock.id);
    router.push(mockHref(mock.id, "run"));
  }

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">Mock test</p>
        <h1 className="text-greeting mt-2">Set up a mock</h1>
        <p className="text-quote mt-3 max-w-xl">
          Pick a subject, set the clock, then begin when you feel ready.
        </p>
      </header>

      <Card className="mt-8 max-w-lg" doodle={<Doodle name="star" size={28} />}>
        <label className="block text-sm font-medium text-charcoal">
          Subject
          <select
            className="touch-target mt-2 w-full rounded-[var(--radius-input)] border border-border-soft bg-warm-white px-4 py-3 text-sm text-charcoal outline-none focus:border-pastel-green-deep focus:ring-2 focus:ring-pastel-green/40"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          >
            <option value="">Choose a subject…</option>
            {SUBJECT_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="__custom__">Other…</option>
          </select>
        </label>

        {subjectName === "__custom__" ? (
          <label className="mt-4 block text-sm font-medium text-charcoal">
            Subject name
            <Input
              className="mt-2"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="e.g. CSAT paper"
            />
          </label>
        ) : null}

        <label className="mt-5 block text-sm font-medium text-charcoal">
          Topics <span className="font-normal text-muted">(optional)</span>
          <Textarea
            className="mt-2"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="Chapters or themes for this paper…"
          />
        </label>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal">Time</span>
            <span className="font-display text-xl font-semibold text-pastel-green-deep">
              {formatMockPlanned(minutes)}
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={180}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--pastel-green-deep)]"
            aria-label="Mock test duration in minutes"
          />
          <div className="mt-1 flex justify-between text-caption">
            <span>15 min</span>
            <span>3 hours</span>
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-charcoal">
          Total questions
          <Input
            className="mt-2"
            type="number"
            min={1}
            max={500}
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Number(e.target.value) || 1)}
          />
        </label>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full"
            disabled={!canStart}
            onClick={onStart}
          >
            {saving ? "Starting…" : "Start mock test"}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push("/mocks")}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
