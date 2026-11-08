"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "./icon";

const pad = (value: number) => String(value).padStart(2, "0");
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

function usePopover() {
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const element = pop.current;
    const trigger = anchor.current;
    if (!open || !element || !trigger) return;
    element.showPopover();
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const height = element.offsetHeight;
      const width = element.offsetWidth;
      const below = rect.bottom + 6 + height <= window.innerHeight;
      element.style.top = `${below ? rect.bottom + 6 : Math.max(8, rect.top - 6 - height)}px`;
      element.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
    };
    place();
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !element.contains(event.target as Node) &&
            !trigger.contains(event.target as Node)
      ) {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", close, true);
    return () => {
      element.hidePopover();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", close, true);
    };
  }, [open]);

  return { anchor, pop, open, setOpen };
}

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

export function DateInput({
  value,
  onChange,
  min,
  max,
  className = "",
  "aria-label": ariaLabel,
}: FieldProps & { min?: string; max?: string }) {
  const { anchor, pop, open, setOpen } = usePopover();
  const base = value || min || new Date().toISOString().slice(0, 10);
  const [view, setView] = useState({
    year: Number(base.slice(0, 4)),
    month: Number(base.slice(5, 7)) - 1,
  });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const offset = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const total = new Date(view.year, view.month + 1, 0).getDate();
  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className={`m3-pick ${className}`}
      >
        <span
          className={`truncate whitespace-nowrap ${value ? "" : "text-on-surface-variant"}`}
        >
          {value
            ? new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : "—"}
        </span>
        <Icon name="calendar" size={15} className="m3-pick-icon" />
      </button>
      {open ? (
        <div ref={pop} popover="manual" className="m3-pop" role="dialog">
          <div className="m3-pop-head">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => shift(-1)}
            >
              <Icon name="back" size={16} />
            </button>
            <b>
              {MONTHS[view.month]} {view.year}
            </b>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => shift(1)}
            >
              <Icon name="next" size={16} />
            </button>
          </div>
          <div className="m3-pop-grid">
            {WEEKDAYS.map((day) => (
              <small key={day}>{day}</small>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`gap-${index}`} />
            ))}
            {Array.from({ length: total }, (_, index) => {
              const key = `${view.year}-${pad(view.month + 1)}-${pad(index + 1)}`;
              const disabled = Boolean(
                (min && key < min) || (max && key > max),
              );
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={key === value}
                  data-today={key === todayKey || undefined}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour));
const MINUTES = Array.from({ length: 12 }, (_, step) => pad(step * 5));

export function TimeInput({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: FieldProps) {
  const { anchor, pop, open, setOpen } = usePopover();
  const [hour, minute] = value ? value.split(":") : ["", ""];
  const columns = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    columns.current
      ?.querySelectorAll<HTMLElement>('[aria-pressed="true"]')
      .forEach((item) => item.scrollIntoView({ block: "center" }));
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className={`m3-pick tabular-nums ${className}`}
      >
        <span className={value ? "" : "text-on-surface-variant"}>
          {value || "—:—"}
        </span>
        <Icon name="clock" size={15} className="m3-pick-icon" />
      </button>
      {open ? (
        <div ref={pop} popover="manual" className="m3-pop" role="dialog">
          <div ref={columns} className="m3-pop-time">
            <div aria-label="Часы">
              {HOURS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === hour}
                  onClick={() => onChange(`${item}:${minute || "00"}`)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div aria-label="Минуты">
              {MINUTES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === minute}
                  onClick={() => {
                    onChange(`${hour || "12"}:${item}`);
                    setOpen(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {value ? (
            <button
              type="button"
              className="m3-pop-clear"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Очистить
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function SelectMenu({
  value,
  onChange,
  options,
  className = "",
  "aria-label": ariaLabel,
}: FieldProps & { options: { value: string; label: string }[] }) {
  const { anchor, pop, open, setOpen } = usePopover();
  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className={`m3-pick ${className}`}
      >
        <span>{current?.label ?? "—"}</span>
        <Icon name="next" size={14} className="m3-pick-icon rotate-90" />
      </button>
      {open ? (
        <div ref={pop} popover="manual" className="m3-pop" role="listbox">
          <div className="m3-pop-list">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {option.value === value ? (
                  <Icon name="check" size={15} />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
