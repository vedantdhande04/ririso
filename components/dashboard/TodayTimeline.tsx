"use client";

import { useEffect, useState } from "react";

import {
  loadTodayPlan,
  type DailyPlanLocal,
  type ShiftSelection,
} from "@/lib/planning-storage";
import { loadDaySessions } from "@/lib/session-storage";
import type { ShiftSlot } from "@/lib/supabase/types";

const LABELS: Record<ShiftSlot, string> = {
  morning: "8 AM · Morning",
  second: "10 AM · Second",
  third: "2 PM · Third",
  additional: "4 PM · Additional",
};

export function TodayTimeline() {
  const [plan, setPlan] = useState<DailyPlanLocal | null>(null);
  const [currentShift, setCurrentShift] = useState<ShiftSlot | null>(null);
  const [completedShifts, setCompletedShifts] = useState<ShiftSlot[]>([]);
  const [skippedShifts, setSkippedShifts] = useState<ShiftSlot[]>([]);

  useEffect(() => {
    const today = loadTodayPlan();
    setPlan(today);
    const sessions = loadDaySessions();
    const current = sessions.queue[sessions.currentIndex];
    setCurrentShift(current?.shift ?? null);
    setCompletedShifts(
      sessions.sessions
        .filter((s) => s.status === "completed")
        .map((s) => s.shift),
    );
    setSkippedShifts(
      sessions.sessions
        .filter((s) => s.status === "skipped")
        .map((s) => s.shift),
    );
  }, []);

  if (!plan) return null;

  const items = (
    Object.entries(plan.shifts) as [ShiftSlot, ShiftSelection][]
  ).filter(([, s]) => s.subjectName && s.subjectName !== "None");

  if (items.length === 0) {
    return (
      <p className="text-quote">
        A soft rest day — or open planning to choose subjects.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l-2 border-border-soft pl-5">
      {items.map(([shift, selection]) => {
        const done = completedShifts.includes(shift);
        const skipped = skippedShifts.includes(shift);
        const current = currentShift === shift && !done && !skipped;
        return (
          <li key={shift} className="relative pb-6 last:pb-0">
            <span
              className={`absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full ${
                done
                  ? "bg-pastel-green-deep"
                  : skipped
                    ? "bg-pastel-yellow-deep"
                    : current
                      ? "bg-pastel-pink-deep ring-4 ring-pastel-pink/40"
                      : "bg-soft"
              }`}
            />
            <p className="text-caption">{LABELS[shift]}</p>
            <p
              className={`font-display text-base font-semibold ${
                done
                  ? "animate-slide-completed text-pastel-green-deep"
                  : skipped
                    ? "text-pastel-yellow-deep"
                    : "text-charcoal"
              }`}
            >
              {selection.subjectName}
            </p>
            <p className="text-caption">
              {selection.topicName}
              {done
                ? " · Completed"
                : skipped
                  ? " · Skipped"
                  : current
                    ? " · Current"
                    : " · Upcoming"}
            </p>
          </li>
        );
      })}
      <li className="relative">
        <span className="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full bg-pastel-yellow-deep" />
        <p className="text-caption">6 PM · Later</p>
        <p className="font-display text-base font-semibold text-charcoal">
          Daily Revision
        </p>
      </li>
    </ol>
  );
}
