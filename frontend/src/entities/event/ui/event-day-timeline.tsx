"use client";

import type { ReactNode } from "react";

import { Icon, type IconName } from "@shared/ui";

import type { Event } from "../model";

interface EventDayTimelineProps {
  events: Event[];
  windowStart: number;
  windowEnd: number;
  hourWidth: number;
  selectedId: number | null;
  placeNumbers: Map<number, number>;
  onSelect: (eventId: number) => void;
}

const HOUR_MS = 3_600_000;
const PADDING = 24;
const RULER = 30;
const AXIS_Y = 128;
const CALLOUT_H = 28;
const CALLOUT_TOPS = [RULER + 6, RULER + 38];
const BAR_TOP = AXIS_Y - 28;

export const TRANSPORT_META: Record<
  string,
  { label: string; icon: IconName; pattern: string }
> = {
  plane: {
    label: "Самолёт",
    icon: "plane",
    pattern:
      "repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 14px)",
  },
  train: {
    label: "Поезд",
    icon: "train",
    pattern:
      "linear-gradient(currentColor, currentColor) 0 50% / 100% 2px no-repeat, repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 8px)",
  },
  car: { label: "Авто", icon: "car", pattern: "currentColor" },
  walk: {
    label: "Пешком",
    icon: "walk",
    pattern:
      "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 8px)",
  },
  other: {
    label: "Дорога",
    icon: "bus",
    pattern:
      "repeating-linear-gradient(90deg, currentColor 0 12px, transparent 12px 18px)",
  },
};

export const CATEGORY_ICON: Record<string, IconName> = {
  excursion: "museum",
  museum: "museum",
  theater: "star",
  walk: "walk",
  accommodation: "bed",
  restaurant: "food",
  meeting: "people",
  other: "pin",
};

export const CATEGORY_TONE: Record<string, string> = {
  excursion: "lavender",
  museum: "violet",
  theater: "rose",
  walk: "mint",
  accommodation: "sky",
  restaurant: "peach",
  meeting: "amber",
  other: "slate",
};

export const TRANSPORT_TONE: Record<string, string> = {
  plane: "lavender",
  train: "mint",
  car: "peach",
  walk: "slate",
  other: "amber",
};

const time = (value: number) =>
  new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
};

export const timelineX = (
  value: number,
  windowStart: number,
  hourWidth: number,
) => PADDING + ((value - windowStart) / HOUR_MS) * hourWidth;

export function EventDayTimeline({
  events,
  windowStart,
  windowEnd,
  hourWidth,
  selectedId,
  placeNumbers,
  onSelect,
}: EventDayTimelineProps) {
  const x = (value: number) => timelineX(value, windowStart, hourWidth);
  const width = x(windowEnd) + PADDING;
  const labelStep =
    hourWidth >= 70 ? 1 : hourWidth >= 36 ? 2 : hourWidth >= 18 ? 3 : 6;
  const hours: number[] = [];
  for (let t = windowStart; t <= windowEnd; t += HOUR_MS) hours.push(t);

  const isBand = (event: Event, start: number, end: number | null) =>
    event.type === "activity" &&
    event.category === "accommodation" &&
    end !== null &&
    end - start >= 6 * HOUR_MS;
  const calloutRows = new Map<number, number>();
  const rowEnds = CALLOUT_TOPS.map(() => -Infinity);
  events
    .filter((event) => {
      if (event.type === "movement") return false;
      const start = Date.parse(event.startAt);
      const end = event.endAt ? Date.parse(event.endAt) : null;
      if (isBand(event, start, end)) return false;
      return end === null || x(end) - x(start) < 96;
    })
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))
    .forEach((event) => {
      const left = x(Date.parse(event.startAt)) - 7;
      const free = rowEnds.findIndex((end) => end + 6 <= left);
      const row = free === -1 ? rowEnds.indexOf(Math.min(...rowEnds)) : free;
      rowEnds[row] = left + Math.min(224, 56 + (event.title.length + 8) * 6.4);
      calloutRows.set(event.id, row);
    });

  const callout = (
    event: Event,
    start: number,
    badge: ReactNode,
    selected: boolean,
    targetY: number,
    dot: boolean,
  ) => {
    const top = CALLOUT_TOPS[calloutRows.get(event.id) ?? 0];
    return (
      <button
        key={`callout-${event.id}`}
        type="button"
        onClick={() => onSelect(event.id)}
        aria-pressed={selected}
        aria-label={`${event.title}, ${time(start)}`}
        data-tone={
          event.type === "activity" ? CATEGORY_TONE[event.category] : undefined
        }
        className="group absolute"
        style={{ left: x(start) - 7, top }}
      >
        <span
          className={`flex max-w-56 items-center gap-2 rounded-small pr-3 pl-1 text-xs font-extrabold whitespace-nowrap ring-[1.5px] ring-tone-solid transition-colors ring-inset ${
            selected
              ? "bg-primary text-on-primary"
              : "bg-surface-bright text-on-surface group-hover:bg-tone-bg"
          }`}
          style={{ height: CALLOUT_H }}
        >
          {badge}
          <span className="truncate">
            {time(start)} · {event.title}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="absolute left-[6px] w-0.5"
          style={{
            top: CALLOUT_H,
            height: Math.max(targetY - top - CALLOUT_H - (dot ? 7 : 0), 0),
            background:
              "repeating-linear-gradient(var(--tone-solid) 0 3px, transparent 3px 6px)",
          }}
        />
        {dot ? (
          <span
            aria-hidden="true"
            className="absolute left-0 size-3.5 rounded-full border-[3px] border-tone-solid bg-surface-bright"
            style={{ top: targetY - top - 7 }}
          />
        ) : null}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="События по времени"
      className="relative h-48 select-none"
      style={{ width }}
    >
      {hours.map((tick) => {
        const hour = new Date(tick).getHours();
        const isMidnight = hour === 0 && tick < windowEnd;
        const nearChip =
          !isMidnight &&
          hours.some(
            (other) =>
              other < windowEnd &&
              new Date(other).getHours() === 0 &&
              x(tick) - x(other) >= 0 &&
              x(tick) - x(other) < 120,
          );
        const night = hour < 7 || hour >= 22;
        return (
          <div key={tick}>
            {night && tick < windowEnd ? (
              <div
                aria-hidden="true"
                className="absolute bottom-0 bg-surface-container-low"
                style={{ left: x(tick), width: hourWidth, top: RULER }}
              />
            ) : null}
            <div
              aria-hidden="true"
              className={`absolute bottom-0 border-l ${
                isMidnight
                  ? "border-on-surface-variant/40"
                  : hour % labelStep === 0
                    ? "border-outline-variant"
                    : "border-outline-variant/50"
              }`}
              style={{ left: x(tick), top: isMidnight ? 0 : RULER - 6 }}
            />
            {isMidnight ? (
              <span
                className="absolute top-0 rounded-small bg-on-surface px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-surface-bright"
                style={{ left: x(tick) + 6 }}
              >
                {new Date(tick).toLocaleDateString("ru-RU", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            ) : hour % labelStep === 0 && !nearChip && tick < windowEnd ? (
              <span
                className="absolute top-1 -translate-x-1/2 text-[11px] font-bold text-on-surface-variant tabular-nums"
                style={{ left: x(tick) }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ) : null}
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="absolute right-0 left-0 h-0.5 bg-surface-container-high"
        style={{ top: AXIS_Y - 1 }}
      />

      {events.map((event) => {
        const start = new Date(event.startAt).getTime();
        const end = event.endAt ? new Date(event.endAt).getTime() : null;
        const selected = event.id === selectedId;
        const left = x(start);

        if (event.type === "movement") {
          const meta =
            TRANSPORT_META[event.transportType] ?? TRANSPORT_META.other;
          const segment = Math.max((end ? x(end) : left + 24) - left, 24);
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              aria-pressed={selected}
              aria-label={`${meta.label}: ${event.fromPlace.name} → ${event.toPlace.name}, ${time(start)}${end ? `–${time(end)}` : ""}`}
              title={`${meta.label} · ${event.fromPlace.name} → ${event.toPlace.name} · ${time(start)}${end ? `–${time(end)}` : ""}`}
              className={`group absolute ${selected ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              style={{ left, top: AXIS_Y - 18, width: segment, height: 56 }}
            >
              <span
                aria-hidden="true"
                className="absolute right-0 left-0 h-1.5 rounded-full opacity-70"
                style={{ top: 15, background: meta.pattern }}
              />
              <span
                className={`absolute top-1 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full ring-[1.5px] transition-colors ${selected ? "bg-primary text-on-primary ring-primary" : "bg-surface-bright ring-outline group-hover:ring-on-surface"}`}
              >
                <Icon name={meta.icon} size={14} />
              </span>
              {segment >= 64 ? (
                <span className="absolute top-9 left-1/2 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap">
                  {end ? formatDuration(end - start) : time(start)}
                </span>
              ) : null}
            </button>
          );
        }

        const number = event.place ? placeNumbers.get(event.place.id) : null;

        if (end !== null && isBand(event, start, end)) {
          const bandLeft = Math.max(left, PADDING);
          const bandRight = Math.min(x(end), width - PADDING);
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              aria-pressed={selected}
              aria-label={`${event.title}, ${time(start)} – ${time(end)}`}
              title={event.title}
              data-tone="sky"
              className={`absolute flex h-6 items-center gap-1.5 overflow-hidden rounded-full px-2 text-[11px] font-bold whitespace-nowrap ${
                selected
                  ? "bg-primary text-on-primary"
                  : "bg-tone-bg text-tone-fg hover:ring-[1.5px] hover:ring-tone-solid hover:ring-inset"
              }`}
              style={{
                left: bandLeft,
                width: Math.max(bandRight - bandLeft, 24),
                top: AXIS_Y + 34,
              }}
            >
              <Icon name="bed" size={13} />
              {event.title}
            </button>
          );
        }
        const badge = (
          <span
            className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
              selected
                ? "bg-on-primary text-primary"
                : "bg-tone-solid text-white"
            }`}
          >
            {number ?? <Icon name={CATEGORY_ICON[event.category]} size={11} />}
          </span>
        );

        if (end === null) {
          return callout(event, start, badge, selected, AXIS_Y, true);
        }

        const barWidth = Math.max(x(end) - left, 32);
        const bar = (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            aria-pressed={selected}
            aria-label={`${event.title}, ${time(start)}–${time(end)}`}
            title={`${event.title} · ${time(start)}–${time(end)}`}
            data-tone={CATEGORY_TONE[event.category]}
            className={`absolute flex items-center gap-2 overflow-hidden rounded-medium px-2 text-left whitespace-nowrap transition-[background,box-shadow] ${
              selected
                ? "bg-primary text-on-primary shadow-[var(--shadow-primary)]"
                : "bg-tone-bg text-tone-fg ring-[1.5px] ring-tone-solid/30 ring-inset hover:ring-tone-solid"
            }`}
            style={{ left, top: BAR_TOP, width: barWidth, height: 56 }}
          >
            {badge}
            {barWidth >= 96 ? (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold">
                  {event.title}
                </span>
                <span
                  className={`truncate text-xs font-semibold ${selected ? "text-on-primary/80" : ""}`}
                >
                  {time(start)} – {time(end)}
                </span>
              </span>
            ) : null}
          </button>
        );
        return barWidth >= 96 ? (
          bar
        ) : (
          <span key={event.id} className="contents">
            {bar}
            {callout(event, start, badge, selected, BAR_TOP, false)}
          </span>
        );
      })}
    </div>
  );
}
