"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { getStudyDayKey } from "@/lib/date";
import {
  getRevisionsForDate,
  getStickersForMonth,
  type CalendarSticker,
} from "@/lib/revision-storage";
import { supportive } from "@/lib/copy";
import type { RevisionType } from "@/lib/supabase/types";

const stickerEmoji: Record<RevisionType, string> = {
  same_day: "🍀",
  next_day: "📌",
  weekly: "📖",
  fifteen_day: "🌸",
  monthly: "🌙",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function PlannerCalendar() {
  const today = getStudyDayKey();
  const initial = new Date(`${today}T12:00:00`);
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selected, setSelected] = useState(today);

  const stickers = useMemo(
    () => getStickersForMonth(cursor.year, cursor.month),
    [cursor],
  );

  const stickersByDate = useMemo(() => {
    const map = new Map<string, CalendarSticker[]>();
    for (const s of stickers) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [stickers]);

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const month = String(cursor.month + 1).padStart(2, "0");
      return `${cursor.year}-${month}-${day}`;
    }),
  ];

  const selectedRevisions = getRevisionsForDate(selected);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString(
    "en-IN",
    { month: "long", year: "numeric" },
  );

  return (
    <PageShell>
      <header className="animate-card-enter">
        <h1 className="text-greeting">Planner</h1>
        <p className="text-quote mt-2">
          Soft stickers for revision days — your study calendar, gently.
        </p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card doodle={<Doodle name="spark" size={30} />}>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="touch-target rounded-[18px] px-3 text-sm font-semibold text-muted hover:bg-ivory"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              Prev
            </button>
            <p className="font-display text-lg font-semibold text-charcoal">
              {monthLabel}
            </p>
            <button
              type="button"
              className="touch-target rounded-[18px] px-3 text-sm font-semibold text-muted hover:bg-ivory"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              Next
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted sm:text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-14" />;
              }
              const dayStickers = stickersByDate.get(date) ?? [];
              const isSelected = selected === date;
              const isToday = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={`touch-target flex min-h-14 flex-col items-center justify-start rounded-[16px] border px-1 py-1.5 text-sm transition ${
                    isSelected
                      ? "border-pastel-green-deep bg-pastel-green/40"
                      : isToday
                        ? "border-pastel-pink-deep/50 bg-pastel-pink/20"
                        : "border-transparent bg-ivory/50 hover:bg-ivory"
                  }`}
                >
                  <span className="font-semibold text-charcoal">
                    {Number(date.slice(8, 10))}
                  </span>
                  <span className="mt-0.5 flex flex-wrap justify-center gap-0.5 text-[10px] leading-none">
                    {dayStickers.slice(0, 3).map((s) => (
                      <span key={s.revisionId} title={s.label}>
                        {stickerEmoji[s.revisionType]}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="md:sticky md:top-6">
          <p className="text-caption">Selected day</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-charcoal">
            {selected}
          </h2>
          {selectedRevisions.length === 0 ? (
            <p className="text-quote mt-4">{supportive.calendarQuiet}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedRevisions.map((r) => (
                <li
                  key={r.id}
                  className="rounded-[18px] border border-border-soft bg-ivory/70 p-3"
                >
                  <p className="text-sm font-semibold text-charcoal">
                    {stickerEmoji[r.revisionType]}{" "}
                    {r.revisionType.replaceAll("_", " ")}
                  </p>
                  <p className="text-caption mt-1">
                    {r.completedAt ? "Completed" : "Waiting gently"}
                  </p>
                  {!r.completedAt && r.scheduledFor === today ? (
                    <Link
                      href={`/revision?type=${r.revisionType}`}
                      className="mt-3 inline-flex text-sm font-semibold text-pastel-green-deep underline-offset-2 hover:underline"
                    >
                      Start revision
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
