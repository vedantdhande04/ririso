"use client";

import { useMemo, useState } from "react";

import { hoursLabel, msToHours, type AnalyticsSnapshot } from "@/lib/analytics";
import { getStudyDayKey } from "@/lib/date";

const GREENS = ["#F3F0EA", "#E8F5EC", "#C9E6D1", "#B8D8C0", "#7FAD8C", "#5F8F6C"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const selectClass =
  "touch-target rounded-[var(--radius-input)] border border-border-soft bg-warm-white px-3 py-2 text-sm font-semibold text-charcoal outline-none transition focus:border-pastel-green-deep focus:ring-2 focus:ring-pastel-green/40";

type StudyHeatmapProps = {
  data: AnalyticsSnapshot;
};

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function heatLevel(hours: number, maxHours: number): number {
  if (hours <= 0) return 0;
  const intensity = hours / Math.max(maxHours, 0.01);
  if (intensity < 0.2) return 1;
  if (intensity < 0.4) return 2;
  if (intensity < 0.65) return 3;
  if (intensity < 0.85) return 4;
  return 5;
}

export function StudyHeatmap({ data }: StudyHeatmapProps) {
  const today = getStudyDayKey();
  const todayDate = new Date(`${today}T12:00:00`);

  const hoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of data.heatmap) {
      map.set(day.date, day.hours);
    }
    for (const [date, blocks] of Object.entries(data.dayBlocks)) {
      if (map.has(date)) continue;
      const ms = blocks
        .filter((b) => b.kind === "study")
        .reduce((sum, b) => sum + b.ms, 0);
      if (ms > 0) map.set(date, Number(msToHours(ms).toFixed(2)));
    }
    return map;
  }, [data.dayBlocks, data.heatmap]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([todayDate.getFullYear()]);
    for (const date of hoursByDate.keys()) {
      years.add(Number(date.slice(0, 4)));
    }
    for (const date of data.replayDays) {
      years.add(Number(date.slice(0, 4)));
    }
    return [...years].sort((a, b) => b - a);
  }, [data.replayDays, hoursByDate, todayDate]);

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(today);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const totalDays = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();

  const monthMaxHours = useMemo(() => {
    let max = 0.01;
    for (let d = 1; d <= totalDays; d += 1) {
      const key = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      max = Math.max(max, hoursByDate.get(key) ?? 0);
    }
    return max;
  }, [hoursByDate, monthPrefix, totalDays]);

  const cells: Array<{ date: string | null; dayNum: number | null }> = [
    ...Array.from({ length: firstWeekday }, () => ({
      date: null as string | null,
      dayNum: null as number | null,
    })),
    ...Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      return {
        date: `${monthPrefix}-${String(dayNum).padStart(2, "0")}`,
        dayNum,
      };
    }),
  ];

  // Cap visual rows: calendar already ~30 day cells; pad to full weeks only
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNum: null });
  }

  const dayBlocks = selectedDay ? (data.dayBlocks[selectedDay] ?? []) : [];
  const selectedHours = selectedDay ? (hoursByDate.get(selectedDay) ?? 0) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pr-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Study heatmap
          </h2>
          <p className="text-caption mt-1">One month at a time — tap a day.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="heat-month">
            Month
          </label>
          <select
            id="heat-month"
            className={selectClass}
            value={month}
            onChange={(e) => {
              setMonth(Number(e.target.value));
              setSelectedDay(null);
            }}
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="heat-year">
            Year
          </label>
          <select
            id="heat-year"
            className={selectClass}
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setSelectedDay(null);
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <p
              key={`${d}-${i}`}
              className="text-center text-[11px] font-semibold uppercase tracking-wide text-soft"
            >
              {d}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, index) => {
            if (!cell.date || cell.dayNum == null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const hours = hoursByDate.get(cell.date) ?? 0;
            const level = heatLevel(hours, monthMaxHours);
            const selected = selectedDay === cell.date;
            const isToday = cell.date === today;
            const isFuture = cell.date > today;

            return (
              <button
                key={cell.date}
                type="button"
                disabled={isFuture}
                title={`${cell.date}: ${hours}h`}
                onClick={() =>
                  setSelectedDay((prev) =>
                    prev === cell.date ? null : cell.date,
                  )
                }
                className={`relative aspect-square rounded-[12px] border text-xs font-semibold transition active:scale-95 sm:rounded-[14px] sm:text-sm ${
                  isFuture
                    ? "cursor-default border-transparent bg-transparent text-soft/40"
                    : selected
                      ? "border-pastel-green-deep bg-pastel-green/50 text-charcoal ring-2 ring-pastel-green-deep/40"
                      : "border-border-soft/70 text-charcoal hover:scale-[1.03]"
                } ${isToday && !selected ? "ring-1 ring-pastel-pink-deep/70" : ""}`}
                style={
                  isFuture
                    ? undefined
                    : { backgroundColor: selected ? undefined : GREENS[level] }
                }
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  {cell.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-caption">
            {totalDays} days · deeper green = more study
          </p>
          <div className="flex items-center gap-1" aria-hidden>
            <span className="text-[10px] text-soft">Less</span>
            {GREENS.slice(1).map((color) => (
              <span
                key={color}
                className="h-2.5 w-2.5 rounded-[3px] border border-border-soft/40"
                style={{ backgroundColor: color }}
              />
            ))}
            <span className="text-[10px] text-soft">More</span>
          </div>
        </div>
      </div>

      {selectedDay ? (
        <div className="mt-4 rounded-[18px] border border-border-soft bg-ivory/70 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-charcoal">{selectedDay}</p>
            <p className="text-caption text-pastel-green-deep">
              {selectedHours > 0
                ? `${selectedHours.toFixed(2)}h studied`
                : "Quiet day"}
            </p>
          </div>
          <ul className="soft-scroll mt-2 max-h-36 space-y-2 overflow-y-auto">
            {dayBlocks.length === 0 ? (
              <li className="text-caption">A quiet day.</li>
            ) : (
              dayBlocks.map((b, i) => (
                <li key={`${b.start}-${i}`} className="text-caption">
                  <span
                    className={
                      b.kind === "study"
                        ? "text-pastel-green-deep"
                        : b.kind === "revision"
                          ? "text-pastel-lavender-deep"
                          : "text-muted"
                    }
                  >
                    {b.kind === "study"
                      ? "████"
                      : b.kind === "pause"
                        ? "░░░░"
                        : "····"}
                  </span>{" "}
                  {b.label}
                  {b.subjectName ? ` · ${b.subjectName}` : ""}
                  {b.topicName ? ` · ${b.topicName}` : ""} · {hoursLabel(b.ms)}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
