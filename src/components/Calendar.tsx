"use client";

import { useState } from "react";
import { toDateKey } from "@/lib/time";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

type Props = {
  selected: string | null; // 'YYYY-MM-DD'
  onSelect: (dateKey: string) => void;
};

export function Calendar({ selected, onSelect }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Понедельник первым: getDay() даёт 0=вс..6=сб, переводим к 0=пн..6=вс
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const weekHeaders = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const canGoPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoPrev && setCursor(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          aria-label="Предыдущий месяц"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="font-display text-lg tracking-tight">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Следующий месяц"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-ink/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {weekHeaders.map((w) => (
          <div key={w} className="py-1 font-medium uppercase tracking-wide">{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`b${idx}`} />;
          const key = toDateKey(date);
          const isPast = date < today;
          const isSelected = key === selected;
          const isToday = key === toDateKey(today);
          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(key)}
              className={[
                "relative aspect-square rounded-lg text-sm transition",
                isPast ? "cursor-not-allowed text-ink/25" : "hover:bg-clay-50",
                isSelected ? "bg-ink text-paper hover:bg-ink" : "",
                !isSelected && isToday ? "font-semibold text-clay" : "",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
