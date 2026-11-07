"use client";

import { useId, useRef, useState } from "react";

import { formatDate } from "@shared/lib";

import { Button } from "./button";
import { FormField } from "./form-field";
import { SelectField } from "./select-field";

interface DatePickerProps {
  label: string;
  "aria-describedby"?: string;
  value: string;
  onChange: (value: string) => void;
  endValue?: string;
  onEndChange?: (value: string) => void;
  requireEnd?: boolean;
  onBlur?: () => void;
  ref?: React.Ref<HTMLButtonElement>;
  name?: string;
  id?: string;
  error?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  withTime?: boolean;
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
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const pad = (value: number) => String(value).padStart(2, "0");
const makeDate = (year: number, month: number, day: number) => {
  const date = new Date("2000-01-01T12:00:00");
  date.setFullYear(year, month, day);
  return date;
};
const dateKey = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);

export function DatePicker({
  label,
  "aria-describedby": describedBy,
  value,
  onChange,
  endValue = "",
  onEndChange,
  requireEnd = false,
  onBlur,
  ref,
  name,
  id,
  error,
  disabled = false,
  min,
  max,
  withTime = false,
}: DatePickerProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [choosingEnd, setChoosingEnd] = useState(false);
  const [view, setView] = useState({ year: 2000, month: 0 });
  const [yearInput, setYearInput] = useState("2000");
  const [focusedDay, setFocusedDay] = useState(1);
  const selected = value.slice(0, 10);
  const minDay = min?.slice(0, 10);
  const maxDay = max?.slice(0, 10);
  const hours = value.slice(11, 13) || "00";
  const minutes = value.slice(14, 16) || "00";
  const timeSuffix = value.slice(16);
  const daysInMonth = makeDate(view.year, view.month + 1, 0).getDate();
  const firstDay = (makeDate(view.year, view.month, 1).getDay() + 6) % 7;
  const unavailable = (day: string) =>
    Boolean((minDay && day < minDay) || (maxDay && day > maxDay));
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
    onBlur?.();
  };
  const showMonth = (date: Date, focus = false) => {
    const year = date.getFullYear();
    if (year < 1 || year > 9999) return;
    setView({ year, month: date.getMonth() });
    setYearInput(String(year));
    setFocusedDay(date.getDate());
    if (focus)
      requestAnimationFrame(() => {
        gridRef.current
          ?.querySelector<HTMLButtonElement>(`[data-day="${date.getDate()}"]`)
          ?.focus();
      });
  };
  const changeMonth = (offset: number) => {
    const date = makeDate(view.year, view.month + offset, 1);
    const monthEnd = dateKey(
      makeDate(date.getFullYear(), date.getMonth() + 1, 0),
    );
    if (offset < 0 && minDay && monthEnd < minDay) return;
    if (offset > 0 && maxDay && dateKey(date) > maxDay) return;
    showMonth(date);
  };

  return (
    <div
      className="m3-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <span id={`${fieldId}-label`} className="m3-label">
        {label}
      </span>
      <Button
        ref={(element) => {
          triggerRef.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        id={fieldId}
        name={name}
        disabled={disabled}
        variant="outlined"
        className="m3-date-trigger"
        aria-labelledby={`${fieldId}-label ${fieldId}-value`}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [describedBy, error ? `${fieldId}-error` : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-expanded={open}
        aria-controls={open ? `${fieldId}-calendar` : undefined}
        onClick={() => {
          if (open) close();
          else {
            const today = dateKey(new Date());
            const target =
              selected ||
              (minDay && today < minDay
                ? minDay
                : maxDay && today > maxDay
                  ? maxDay
                  : today);
            setDraftStart(selected);
            setDraftEnd(endValue.slice(0, 10));
            setChoosingEnd(false);
            showMonth(parseDate(target), true);
            setOpen(true);
          }
        }}
      >
        <span id={`${fieldId}-value`}>
          {selected
            ? `${formatDate(selected)}${endValue && endValue.slice(0, 10) !== selected ? ` — ${formatDate(endValue.slice(0, 10))}` : ""}`
            : "Выберите дату"}
        </span>
        <span aria-hidden="true">{open ? "−" : "＋"}</span>
      </Button>
      {open ? (
        <div
          id={`${fieldId}-calendar`}
          className="m3-calendar"
          role="group"
          aria-label={`${label}: календарь`}
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="text"
              aria-label="Предыдущий месяц"
              disabled={
                disabled ||
                (view.year === 1 && view.month === 0) ||
                Boolean(
                  minDay &&
                  dateKey(makeDate(view.year, view.month, 0)) < minDay,
                )
              }
              onClick={() => changeMonth(-1)}
            >
              ←
            </Button>
            <p className="m3-label text-center" aria-live="polite">
              {MONTHS[view.month]} {view.year}
            </p>
            <Button
              variant="text"
              aria-label="Следующий месяц"
              disabled={
                disabled ||
                (view.year === 9999 && view.month === 11) ||
                Boolean(
                  maxDay &&
                  dateKey(makeDate(view.year, view.month + 1, 1)) > maxDay,
                )
              }
              onClick={() => changeMonth(1)}
            >
              →
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Месяц"
              id={`${fieldId}-month`}
              disabled={disabled}
              value={view.month}
              onChange={(event) => {
                showMonth(makeDate(view.year, Number(event.target.value), 1));
              }}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </SelectField>
            <FormField
              label="Год"
              id={`${fieldId}-year`}
              disabled={disabled}
              type="number"
              min={1}
              max={9999}
              value={yearInput}
              inputMode="numeric"
              onChange={(event) => {
                const raw = event.target.value;
                setYearInput(raw);
                const year = Number(raw);
                if (Number.isInteger(year) && year >= 1 && year <= 9999)
                  showMonth(makeDate(year, view.month, 1));
              }}
              onBlur={() => setYearInput(String(view.year))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  showMonth(makeDate(view.year, view.month, 1), true);
                }
              }}
            />
          </div>
          {minDay || maxDay ? (
            <p className="m3-support">
              Доступные даты: {minDay ? formatDate(minDay) : "без ограничения"}{" "}
              — {maxDay ? formatDate(maxDay) : "без ограничения"}.
            </p>
          ) : null}
          <div
            ref={gridRef}
            role="grid"
            aria-label={`${MONTHS[view.month]} ${view.year}`}
            className="m3-calendar-grid"
          >
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  role="columnheader"
                  className="m3-calendar-weekday"
                >
                  {day}
                </span>
              ))}
            </div>
            {Array.from(
              { length: Math.ceil((firstDay + daysInMonth) / 7) },
              (_, week) => (
                <div key={week} role="row" className="grid grid-cols-7">
                  {Array.from({ length: 7 }, (_, weekday) => {
                    const day = week * 7 + weekday - firstDay + 1;
                    if (day < 1 || day > daysInMonth)
                      return <span key={weekday} role="gridcell" />;
                    const key = dateKey(makeDate(view.year, view.month, day));
                    const blocked = unavailable(key);
                    return (
                      <span
                        key={weekday}
                        role="gridcell"
                        aria-selected={
                          onEndChange
                            ? Boolean(
                                draftStart &&
                                key >= draftStart &&
                                key <= (draftEnd || draftStart),
                              )
                            : key === selected
                        }
                      >
                        <button
                          type="button"
                          data-day={day}
                          tabIndex={day === focusedDay ? 0 : -1}
                          disabled={disabled}
                          aria-disabled={blocked}
                          aria-label={
                            key === draftStart && key === draftEnd
                              ? `${formatDate(key)}, начало и окончание`
                              : formatDate(key)
                          }
                          className={`m3-calendar-day ${key === draftStart && key === draftEnd ? "ring-2 ring-inset ring-on-primary" : ""}`}
                          onFocus={() => setFocusedDay(day)}
                          onClick={() => {
                            if (blocked) return;
                            if (onEndChange) {
                              if (!choosingEnd || key < draftStart) {
                                setDraftStart(key);
                                setDraftEnd("");
                                setChoosingEnd(true);
                              } else {
                                setDraftEnd(key);
                                setChoosingEnd(false);
                              }
                            } else {
                              onChange(
                                withTime
                                  ? `${key}T${hours}:${minutes}${timeSuffix}`
                                  : key,
                              );
                              close();
                            }
                          }}
                          onKeyDown={(event) => {
                            const offsets: Record<string, number> = {
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                              Home: -(
                                (makeDate(view.year, view.month, day).getDay() +
                                  6) %
                                7
                              ),
                              End:
                                6 -
                                ((makeDate(
                                  view.year,
                                  view.month,
                                  day,
                                ).getDay() +
                                  6) %
                                  7),
                            };
                            if (event.key in offsets) {
                              event.preventDefault();
                              const next = makeDate(
                                view.year,
                                view.month,
                                day + offsets[event.key],
                              );
                              showMonth(next, true);
                            } else if (
                              event.key === "PageUp" ||
                              event.key === "PageDown"
                            ) {
                              event.preventDefault();
                              showMonth(
                                makeDate(
                                  view.year,
                                  view.month +
                                    (event.key === "PageUp" ? -1 : 1),
                                  1,
                                ),
                                true,
                              );
                            }
                          }}
                        >
                          {day}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ),
            )}
          </div>
          {onEndChange && draftStart ? (
            <p className="m3-support" aria-live="polite">
              Начало: {formatDate(draftStart)}. Окончание:{" "}
              {draftEnd ? formatDate(draftEnd) : "не выбрано"}.
            </p>
          ) : null}
          <p className="m3-support">
            День — стрелками, месяц — Page Up / Page Down. Enter — выбрать.
          </p>
          {requireEnd && !draftEnd ? (
            <p className="m3-support">Выберите дату начала и дату окончания.</p>
          ) : null}
          {onEndChange ? (
            <Button
              variant="text"
              disabled={!draftStart || (requireEnd && !draftEnd)}
              onClick={() => {
                onChange(
                  withTime
                    ? `${draftStart}T${hours}:${minutes}${timeSuffix}`
                    : draftStart,
                );
                const end = draftEnd;
                onEndChange(
                  end && withTime
                    ? `${end}T${endValue.slice(11) || `${hours}:${minutes}${timeSuffix}`}`
                    : end,
                );
                close();
              }}
            >
              ОК
            </Button>
          ) : null}
          <Button variant="text" onClick={close}>
            Закрыть календарь
          </Button>
        </div>
      ) : null}
      {withTime ? (
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Часы"
            id={`${fieldId}-hours`}
            disabled={disabled || !selected}
            value={hours}
            onBlur={onBlur}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(
                `${selected}T${event.target.value}:${minutes}${timeSuffix}`,
              )
            }
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={pad(hour)}>
                {pad(hour)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Минуты"
            id={`${fieldId}-minutes`}
            disabled={disabled || !selected}
            value={minutes}
            onBlur={onBlur}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(
                `${selected}T${hours}:${event.target.value}${timeSuffix}`,
              )
            }
          >
            {Array.from({ length: 60 }, (_, minute) => (
              <option key={minute} value={pad(minute)}>
                {pad(minute)}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}
      {withTime && onEndChange && endValue ? (
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Часы окончания"
            id={`${fieldId}-end-hours`}
            disabled={disabled}
            value={endValue.slice(11, 13) || "00"}
            onBlur={onBlur}
            onChange={(event) =>
              onEndChange(
                `${endValue.slice(0, 11)}${event.target.value}${endValue.slice(13)}`,
              )
            }
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={pad(hour)}>
                {pad(hour)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Минуты окончания"
            id={`${fieldId}-end-minutes`}
            disabled={disabled}
            value={endValue.slice(14, 16) || "00"}
            onBlur={onBlur}
            onChange={(event) =>
              onEndChange(
                `${endValue.slice(0, 14)}${event.target.value}${endValue.slice(16)}`,
              )
            }
          >
            {Array.from({ length: 60 }, (_, minute) => (
              <option key={minute} value={pad(minute)}>
                {pad(minute)}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}
      {value ? (
        <Button
          disabled={disabled}
          variant="text"
          className="self-start"
          onClick={() => {
            onChange("");
            onEndChange?.("");
            onBlur?.();
          }}
        >
          Очистить дату
        </Button>
      ) : null}
      {error ? (
        <span
          id={`${fieldId}-error`}
          role="alert"
          className="m3-support m3-field-error"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
