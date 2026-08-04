"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
import { isPastPlanningGate } from "@/lib/date";
import {
  createTopic,
  fetchCatalog,
  subjectsForShift,
  type CatalogSubject,
} from "@/lib/catalog";
import {
  countActiveShifts,
  emptyPlan,
  emptyShift,
  hasPledgedToday,
  loadTodayPlan,
  saveTodayPlan,
  type DailyPlanLocal,
  type ShiftSelection,
} from "@/lib/planning-storage";
import type { ShiftSlot } from "@/lib/supabase/types";

const SHIFT_META: {
  key: ShiftSlot;
  label: string;
  options: readonly string[];
}[] = [
  { key: "morning", label: "Morning Shift", options: MORNING_SUBJECTS },
  { key: "second", label: "Second Shift", options: SECOND_SUBJECTS },
  { key: "third", label: "Third Shift", options: THIRD_SUBJECTS },
  {
    key: "additional",
    label: "Additional Shift",
    options: ADDITIONAL_SUBJECTS,
  },
];

export function PlanningGate() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<DailyPlanLocal>(emptyPlan());
  const [catalog, setCatalog] = useState<CatalogSubject[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [creatingTopicFor, setCreatingTopicFor] = useState<ShiftSlot | null>(
    null,
  );

  useEffect(() => {
    const today = loadTodayPlan();
    setPlan(today);
    const mustPlan = isPastPlanningGate() && !hasPledgedToday();
    setOpen(mustPlan);
    setReady(true);

    if (!mustPlan) return;

    void fetchCatalog()
      .then((data) => {
        setCatalog(data);
        setCatalogError(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Could not load subjects";
        setCatalogError(message);
      });
  }, []);

  useEffect(() => {
    if (catalog.length === 0) return;
    setPlan((prev) => {
      let changed = false;
      const shifts = { ...prev.shifts };
      for (const key of Object.keys(shifts) as ShiftSlot[]) {
        const sel = shifts[key];
        if (
          sel.subjectName &&
          sel.subjectName !== "None" &&
          !sel.subjectId
        ) {
          const subject = subjectsForShift(catalog, key).find(
            (s) => s.name === sel.subjectName,
          );
          if (subject) {
            shifts[key] = { ...sel, subjectId: subject.id };
            changed = true;
          }
        }
      }
      if (!changed) return prev;
      const next = { ...prev, shifts };
      saveTodayPlan(next);
      return next;
    });
  }, [catalog]);

  const canContinue = useMemo(() => {
    const active = (
      Object.entries(plan.shifts) as [ShiftSlot, ShiftSelection][]
    ).filter(([, s]) => s.subjectName && s.subjectName !== "None");
    if (active.length === 0) return true;
    return active.every(([, s]) => Boolean(s.topicId));
  }, [plan]);

  function findSubject(shift: ShiftSlot, subjectName: string) {
    return subjectsForShift(catalog, shift).find((s) => s.name === subjectName);
  }

  function updateShift(shift: ShiftSlot, subjectName: string) {
    setPlan((prev) => {
      if (subjectName === "None") {
        const next: DailyPlanLocal = {
          ...prev,
          shifts: {
            ...prev.shifts,
            [shift]: { ...emptyShift(), subjectName: "None" },
          },
        };
        saveTodayPlan(next);
        return next;
      }

      const subject = findSubject(shift, subjectName);
      const next: DailyPlanLocal = {
        ...prev,
        shifts: {
          ...prev.shifts,
          [shift]: {
            subjectName,
            subjectId: subject?.id ?? null,
            topicId: null,
            topicName: null,
          },
        },
      };
      saveTodayPlan(next);
      return next;
    });
  }

  function updateTopic(shift: ShiftSlot, topicId: string, topicName?: string) {
    setPlan((prev) => {
      const subject = catalog.find((s) => s.id === prev.shifts[shift].subjectId);
      const topic =
        topicName != null
          ? { id: topicId, name: topicName }
          : subject?.topics.find((t) => t.id === topicId);
      const next: DailyPlanLocal = {
        ...prev,
        shifts: {
          ...prev.shifts,
          [shift]: {
            ...prev.shifts[shift],
            topicId,
            topicName: topic?.name ?? null,
          },
        },
      };
      saveTodayPlan(next);
      return next;
    });
  }

  async function handleCreateTopic(shift: ShiftSlot, name: string) {
    const subjectId = plan.shifts[shift].subjectId;
    if (!subjectId) return;

    setCreatingTopicFor(shift);
    try {
      const created = await createTopic(subjectId, name);
      setCatalog((prev) =>
        prev.map((subject) =>
          subject.id === subjectId
            ? { ...subject, topics: [created, ...subject.topics] }
            : subject,
        ),
      );
      updateTopic(shift, created.id, created.name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create topic";
      setCatalogError(message);
      throw err;
    } finally {
      setCreatingTopicFor(null);
    }
  }

  function continueToPledge() {
    const activeCount = countActiveShifts(plan);
    const next: DailyPlanLocal = {
      ...plan,
      status: activeCount === 0 ? "rest" : "draft",
      pledgedAt: activeCount === 0 ? new Date().toISOString() : null,
    };
    saveTodayPlan(next);
    setPlan(next);
    setOpen(false);
    if (activeCount === 0) {
      router.refresh();
      return;
    }
    router.push("/commit");
  }

  if (!ready || !open) return null;

  return (
    <Modal open locked title="Plan your study day">
      <p className="text-caption">
        After 6:00 AM, a gentle plan comes first — then the rest of the day
        opens.
      </p>
      {catalogError ? (
        <p className="text-caption mt-2 text-pastel-pink-deep">{catalogError}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-8">
        {SHIFT_META.map(({ key, label, options }) => {
          const selection = plan.shifts[key];
          const subject =
            selection.subjectName && selection.subjectName !== "None"
              ? findSubject(key, selection.subjectName)
              : null;

          return (
            <div key={key}>
              <ShiftPicker
                label={label}
                options={options}
                value={selection.subjectName}
                onChange={(value) => updateShift(key, value)}
              />
              {subject ? (
                <TopicSelector
                  topics={subject.topics}
                  value={selection.topicId}
                  creating={creatingTopicFor === key}
                  onChange={(topicId) => updateTopic(key, topicId)}
                  onCreate={(name) => handleCreateTopic(key, name)}
                />
              ) : selection.subjectName &&
                selection.subjectName !== "None" &&
                catalog.length === 0 ? (
                <p className="text-caption mt-3">Loading subjects…</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-8 border-t border-border-soft bg-paper pt-4">
        <Button
          className="w-full"
          disabled={!canContinue || Boolean(catalogError)}
          onClick={continueToPledge}
        >
          {countActiveShifts(plan) === 0
            ? "Rest day — save plan"
            : "Continue to pledge"}
        </Button>
        {!canContinue ? (
          <p className="text-caption mt-2 text-center">
            Add or pick a topic for each selected subject, or choose None.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
