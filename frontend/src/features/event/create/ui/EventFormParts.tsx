"use client";

import { useState } from "react";

import type { Event } from "@entities/event";
import type { ActivityCategory, TripDto } from "@shared/api";
import { Button, FormError, Icon, SelectMenu, TimeInput } from "@shared/ui";

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  excursion: "Экскурсия",
  museum: "Музей",
  restaurant: "Еда",
  accommodation: "Жильё",
  walk: "Прогулка",
  theater: "Театр",
  meeting: "Встреча",
  other: "Другое",
};

const DURATIONS = [
  { minutes: 30, label: "30 мин" },
  { minutes: 60, label: "1 ч" },
  { minutes: 90, label: "1,5 ч" },
  { minutes: 120, label: "2 ч" },
  { minutes: 180, label: "3 ч" },
  { minutes: null, label: "Момент" },
];

const pad = (value: number) => String(value).padStart(2, "0");

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function tripDays(trip: Pick<TripDto, "startDate" | "endDate">) {
  const days: string[] = [];
  const cursor = new Date(`${trip.startDate}T12:00:00`);
  const last = new Date(`${trip.endDate}T12:00:00`);
  while (cursor <= last && days.length < 60) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export const dayLabel = (day: string, long = false) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(
    "ru-RU",
    long
      ? { weekday: "long", day: "numeric", month: "long" }
      : { weekday: "short", day: "numeric", month: "short" },
  );

export const isStay = (event: Event) =>
  event.type === "activity" && event.category === "accommodation";

export const blockingEvents = (events: Event[]) =>
  events.filter((event) => !isStay(event));

export function suggestSlot(day: string, events: Event[]) {
  const dayStart = Date.parse(`${day}T00:00:00`);
  const dayEnd = dayStart + 86_400_000;
  const ends = blockingEvents(events)
    .map((event) => Date.parse(event.endAt ?? event.startAt))
    .filter((value) => value >= dayStart && value < dayEnd);
  if (!ends.length) return "10:00";
  const next = new Date(Math.max(...ends) + 30 * 60_000);
  next.setMinutes(Math.ceil(next.getMinutes() / 30) * 30, 0, 0);
  if (next.getTime() >= dayEnd - 60 * 60_000) return "22:00";
  return `${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

export function toRange(day: string, start: string, minutes: number | null) {
  if (!start) return { startAt: "", endAt: "" };
  const startDate = new Date(`${day}T${start}`);
  const startAt = `${day}T${start}`;
  if (minutes === null) return { startAt, endAt: "" };
  const end = new Date(startDate.getTime() + minutes * 60_000);
  return {
    startAt,
    endAt: `${dayKey(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

export const formatSpan = (start: string, minutes: number | null) => {
  if (!start) return "Выберите время";
  if (minutes === null) return `в ${start}`;
  const [hours, mins] = start.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${start} – ${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

export function DaySelect({
  trip,
  value,
  onChange,
}: {
  trip: Pick<TripDto, "startDate" | "endDate">;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      aria-label="День"
      options={tripDays(trip).map((day) => ({
        value: day,
        label: dayLabel(day),
      }))}
      className="m3-pick--chip"
    />
  );
}

export function TimeChip({
  start,
  minutes,
  onChange,
}: {
  start: string;
  minutes: number | null;
  onChange: (start: string, minutes: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Время"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 self-start rounded-full py-2 pr-3.5 pl-3 text-sm font-bold ${
          open
            ? "bg-on-surface text-surface-bright"
            : "bg-surface-container hover:bg-surface-container-high"
        }`}
      >
        <Icon name="clock" size={15} className={open ? "" : "text-primary"} />
        {formatSpan(start, minutes)}
      </button>
      {open ? (
        <div className="flex flex-wrap items-center gap-2 rounded-large bg-surface-container-low p-2">
          <TimeInput
            value={start}
            aria-label="Начало"
            onChange={(value) => onChange(value, minutes)}
          />
          {DURATIONS.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={minutes === item.minutes}
              onClick={() => onChange(start, item.minutes)}
              className="m3-option px-3 py-1.5"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const localDay = (iso: string) => dayKey(new Date(iso));

export const localTime = (iso: string) => {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const minutesBetween = (fromIso: string, toIso: string | null) =>
  toIso ? Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000) : null;

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) *
      Math.cos(rad(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(a));
}

const roundTo5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

export function estimateMinutes(km: number, transport: string) {
  if (transport === "walk") return roundTo5(((km * 1.3) / 4.5) * 60);
  if (transport === "plane") return roundTo5((km / 750) * 60 + 30);
  if (transport === "train") return roundTo5(((km * 1.2) / 70) * 60);
  const speed = km < 30 ? 28 : 70;
  return roundTo5(((km * 1.3) / speed) * 60);
}

export const addMinutes = (time: string, minutes: number) => {
  const [hours, mins] = time.split(":").map(Number);
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export const formatKm = (km: number) =>
  km < 1
    ? `${Math.round(km * 1000)} м`
    : `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} км`;

export const spanMinutes = (start: string, end: string) => {
  if (!start || !end) return null;
  const value = minutesBetween(`2000-01-01T${start}`, `2000-01-01T${end}`);
  return value === null ? null : value <= 0 ? value + 1440 : value;
};

export function WhenRow({
  trip,
  day,
  start,
  end,
  onDay,
  onStart,
  onEnd,
}: {
  trip: Pick<TripDto, "startDate" | "endDate">;
  day: string;
  start: string;
  end: string;
  onDay: (value: string) => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DaySelect trip={trip} value={day} onChange={onDay} />
      <div className="flex items-center gap-1 rounded-full bg-surface-container py-1 pr-1 pl-3">
        <Icon name="clock" size={15} className="text-primary" />
        <TimeInput
          value={start}
          aria-label="Начало"
          onChange={onStart}
          className="m3-pick--bare"
        />
        <span className="text-on-surface-variant">–</span>
        <TimeInput
          value={end}
          aria-label="Конец"
          onChange={onEnd}
          className="m3-pick--bare"
        />
      </div>
    </div>
  );
}

export function FormFooter({
  label,
  disabled,
  pending,
  failed,
  problem,
}: {
  label: string;
  disabled: boolean;
  pending: boolean;
  failed: boolean;
  problem?: string;
}) {
  return (
    <>
      {problem ? <FormError>{problem}</FormError> : null}
      {failed ? (
        <FormError>Не удалось сохранить. Попробуйте ещё раз.</FormError>
      ) : null}
      <Button type="submit" disabled={disabled || pending} className="w-full">
        <Icon name={label === "Сохранить" ? "check" : "plus"} size={18} />
        {pending ? "Сохраняем…" : label}
      </Button>
    </>
  );
}
