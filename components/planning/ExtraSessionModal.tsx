"use client";

import { useEffect, useMemo, useState } from "react";

import { TopicSelector } from "@/components/planning/TopicSelector";
import { ShiftPicker } from "@/components/planning/ShiftPicker";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  ADDITIONAL_SUBJECTS,
  MORNING_SUBJECTS,
  SECOND_SUBJECTS,
  THIRD_SUBJECTS,
} from "@/lib/constants";
import {
  createTopic,
  fetchCatalog,
  subjectsForShift,
  type CatalogSubject,
} from "@/lib/catalog";
import { addExtraSession, type SessionShift } from "@/lib/session-storage";
import type { ShiftSlot } from "@/lib/supabase/types";

type ExtraSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

const SHIFT_OPTIONS = [
  "Morning",
  "Second",
  "Third",
  "Additional",
  "Extra",
] as const;

const shiftMap: Record<(typeof SHIFT_OPTIONS)[number], SessionShift> = {
  Morning: "morning",
  Second: "second",
  Third: "third",
  Additional: "additional",
  Extra: "extra",
};

const subjectOptionsFor = (shiftLabel: string): readonly string[] => {
  switch (shiftLabel) {
    case "Morning":
      return MORNING_SUBJECTS.filter((s) => s !== "None");
    case "Second":
      return SECOND_SUBJECTS.filter((s) => s !== "None");
    case "Third":
      return THIRD_SUBJECTS.filter((s) => s !== "None");
    case "Additional":
      return ADDITIONAL_SUBJECTS.filter((s) => s !== "None");
    default:
      return [
        ...MORNING_SUBJECTS,
        ...SECOND_SUBJECTS,
        ...THIRD_SUBJECTS,
        ...ADDITIONAL_SUBJECTS,
      ].filter((s, i, arr) => s !== "None" && arr.indexOf(s) === i);
  }
};

export function ExtraSessionModal({
  open,
  onClose,
  onAdded,
}: ExtraSessionModalProps) {
  const [catalog, setCatalog] = useState<CatalogSubject[]>([]);
  const [shiftLabel, setShiftLabel] = useState<(typeof SHIFT_OPTIONS)[number]>("Extra");
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShiftLabel("Extra");
    setSubjectName(null);
    setTopicId(null);
    setTopicName(null);
    setError(null);
    void fetchCatalog()
      .then(setCatalog)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load subjects");
      });
  }, [open]);

  const subjectOptions = useMemo(
    () => subjectOptionsFor(shiftLabel),
    [shiftLabel],
  );

  const subject = useMemo(() => {
    if (!subjectName) return null;
    const shift = shiftMap[shiftLabel];
    if (shift === "extra") {
      return catalog.find((s) => s.name === subjectName) ?? null;
    }
    return (
      subjectsForShift(catalog, shift as ShiftSlot).find(
        (s) => s.name === subjectName,
      ) ?? catalog.find((s) => s.name === subjectName) ?? null
    );
  }, [catalog, shiftLabel, subjectName]);

  async function handleCreateTopic(name: string) {
    if (!subject) throw new Error("Pick a subject first");
    setCreating(true);
    try {
      const created = await createTopic(subject.id, name);
      setCatalog((prev) =>
        prev.map((s) =>
          s.id === subject.id ? { ...s, topics: [created, ...s.topics] } : s,
        ),
      );
      setTopicId(created.id);
      setTopicName(created.name);
    } finally {
      setCreating(false);
    }
  }

  function save() {
    if (!subjectName || !topicId || !topicName) {
      setError("Choose a subject and topic");
      return;
    }
    addExtraSession({
      subjectName,
      subjectId: subject?.id ?? null,
      topicId,
      topicName,
      shift: shiftMap[shiftLabel],
    });
    onAdded();
    onClose();
  }

  return (
    <Modal open={open} title="Add an extra session" onClose={onClose}>
      <p className="text-caption">
        Have a little time left? Add another block — start it whenever you like.
      </p>
      {error ? (
        <p className="text-caption mt-2 text-pastel-pink-deep">{error}</p>
      ) : null}

      <div className="mt-5 space-y-6">
        <ShiftPicker
          label="Soft shift label"
          options={SHIFT_OPTIONS}
          value={shiftLabel}
          onChange={(value) => {
            setShiftLabel(value as (typeof SHIFT_OPTIONS)[number]);
            setSubjectName(null);
            setTopicId(null);
            setTopicName(null);
          }}
        />

        <ShiftPicker
          label="Subject"
          options={subjectOptions}
          value={subjectName}
          onChange={(value) => {
            setSubjectName(value);
            setTopicId(null);
            setTopicName(null);
          }}
        />

        {subject ? (
          <TopicSelector
            topics={subject.topics}
            value={topicId}
            creating={creating}
            onChange={(id) => {
              const topic = subject.topics.find((t) => t.id === id);
              setTopicId(id);
              setTopicName(topic?.name ?? null);
            }}
            onCreate={handleCreateTopic}
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" onClick={save}>
          Add session
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
