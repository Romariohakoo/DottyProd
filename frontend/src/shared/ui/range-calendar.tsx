"use client";

import { useState } from "react";

import { Icon } from "./icon";

interface RangeCalendarProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  allowPast?: boolean;
}

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEKDAYS = ["П", "В", "С", "Ч", "П", "С", "В"];
const pad = (value: number) => String(value).padStart(2, "0");
const key = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

function Month({
  year,
  month,
  start,
  end,
  today,
  onPick,
}: {
  year: number;
  month: number;
  start: string;
  end: string;
  today: string;
  onPick: (value: string) => void;
}) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();

  return (
    <div className="grid grid-cols-7 gap-y-1 text-sm font-semibold">
      {WEEKDAYS.map((weekday, index) => (
        <span
          key={index}
          className="grid h-7 place-items-center text-xs text-on-surface-variant"
        >
          {weekday}
        </span>
      ))}
      {Array.from({ length: offset }, (_, index) => (
        <span key={`gap-${index}`} />
      ))}
      {Array.from({ length: days }, (_, index) => {
        const value = key(year, month, index + 1);
        const isEdge = value === start || value === end;
        const inRange = start && end && value > start && value < end;
        const past = value < today;
        return (
          <span
            key={value}
            className={`relative h-11 ${inRange ? "bg-primary-container" : ""} ${
              value === start && end && end !== start
                ? "bg-gradient-to-r from-transparent from-50% to-primary-container to-50%"
                : ""
            } ${
              value === end && start && end !== start
                ? "bg-gradient-to-r from-primary-container from-50% to-transparent to-50%"
                : ""
            }`}
          >
            <button
              type="button"
              disabled={past}
              aria-pressed={isEdge}
              aria-label={`${index + 1} ${MONTHS[month].toLowerCase()}`}
              onClick={() => onPick(value)}
              className={`absolute inset-0 m-auto grid size-11 place-items-center rounded-full ${
                isEdge
                  ? "bg-primary font-extrabold text-on-primary"
                  : past
                    ? "cursor-not-allowed text-outline"
                    : "hover:ring-2 hover:ring-on-surface hover:ring-inset"
              }`}
            >
              {index + 1}
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function RangeCalendar({
  start,
  end,
  onChange,
  allowPast = false,
}: RangeCalendarProps) {
  const now = new Date();
  const today = allowPast
    ? ""
    : key(now.getFullYear(), now.getMonth(), now.getDate());
  const [cursor, setCursor] = useState(() => {
    const base = start ? new Date(`${start}T12:00:00`) : now;
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const second =
    cursor.month === 11
      ? { year: cursor.year + 1, month: 0 }
      : { year: cursor.year, month: cursor.month + 1 };

  const pick = (value: string) => {
    if (!start || end || value < start) onChange(value, "");
    else onChange(start, value);
  };

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const date = new Date(year, month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });

  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
      {[cursor, second].map(({ year, month }, index) => (
        <div key={`${year}-${month}`} className="flex flex-col gap-3">
          <div className="flex h-8 items-center justify-between">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => shift(-1)}
              className={`grid size-8 place-items-center rounded-full hover:bg-surface-container ${index === 0 ? "" : "invisible"}`}
            >
              <Icon name="back" size={18} />
            </button>
            <span className="font-extrabold">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => shift(1)}
              className={`grid size-8 place-items-center rounded-full hover:bg-surface-container ${index === 1 ? "" : "invisible sm:invisible"}`}
            >
              <Icon name="next" size={18} />
            </button>
          </div>
          <Month
            year={year}
            month={month}
            start={start}
            end={end}
            today={today}
            onPick={pick}
          />
        </div>
      ))}
    </div>
  );
}
