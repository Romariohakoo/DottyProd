"use client";

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
const AXIS_Y = 92;

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

export function EventDayTimeline({
  events,
  windowStart,
  windowEnd,
  hourWidth,
  selectedId,
  placeNumbers,
  onSelect,
}: EventDayTimelineProps) {
  const x = (value: number) =>
    24 + ((value - windowStart) / HOUR_MS) * hourWidth;
  const width = x(windowEnd) + 24;
  const step = hourWidth >= 60 ? 1 : hourWidth >= 20 ? 3 : 6;
  const ticks: number[] = [];
  const first = new Date(windowStart);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime(); t <= windowEnd; t += HOUR_MS) {
    if (t >= windowStart && new Date(t).getHours() % step === 0) ticks.push(t);
  }

  return (
    <div
      role="group"
      aria-label="События по времени"
      className="relative h-48"
      style={{ width }}
    >
      {ticks.map((tick) => {
        const hour = new Date(tick).getHours();
        const isMidnight = hour === 0;
        return (
          <div
            key={tick}
            aria-hidden="true"
            className={`absolute top-0 bottom-6 border-l ${isMidnight ? "border-outline" : "border-outline-variant"}`}
            style={{ left: x(tick) }}
          >
            {hour % (step * 2) === 0 || isMidnight ? (
              <span className="absolute -bottom-6 left-0 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap text-on-surface-variant tabular-nums">
                {isMidnight
                  ? new Date(tick).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })
                  : time(tick)}
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
          const center = left + segment / 2;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              aria-pressed={selected}
              aria-label={`${meta.label}: ${event.fromPlace.name} → ${event.toPlace.name}, ${time(start)}${end ? `–${time(end)}` : ""}`}
              title={`${meta.label} · ${event.fromPlace.name} → ${event.toPlace.name}`}
              className={`group absolute ${selected ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              style={{ left, top: AXIS_Y - 20, width: segment, height: 64 }}
            >
              <span
                aria-hidden="true"
                className="absolute right-0 left-0 h-1.5 rounded-full opacity-70"
                style={{ top: 17, background: meta.pattern }}
              />
              <span
                className={`m3-dot absolute top-1.5 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-surface-bright ring-[1.5px] ${selected ? "ring-primary" : "ring-outline"}`}
                style={{ left: center - left }}
              >
                <Icon name={meta.icon} size={14} />
              </span>
              {segment >= 72 ? (
                <span className="absolute top-10 left-1/2 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap">
                  {end ? formatDuration(end - start) : time(start)}
                </span>
              ) : null}
            </button>
          );
        }

        const number = event.place ? placeNumbers.get(event.place.id) : null;
        const badge = (
          <span
            className={`m3-dot grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
              selected
                ? "bg-on-primary text-primary"
                : "bg-on-surface text-surface-bright"
            }`}
          >
            {number ?? <Icon name={CATEGORY_ICON[event.category]} size={11} />}
          </span>
        );

        if (end === null) {
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              aria-pressed={selected}
              aria-label={`${event.title}, ${time(start)}, без времени окончания`}
              className="group absolute"
              style={{ left: left - 7, top: 12 }}
            >
              <span
                className={`flex h-8 max-w-52 items-center gap-2 rounded-small pr-3 pl-1.5 text-xs font-extrabold whitespace-nowrap ring-[1.5px] ring-primary ring-inset ${
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-bright text-on-surface group-hover:bg-primary-container"
                }`}
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
                  top: 32,
                  height: AXIS_Y - 12 - 32 - 7,
                  background:
                    "repeating-linear-gradient(var(--primary) 0 3px, transparent 3px 6px)",
                }}
              />
              <span
                aria-hidden="true"
                className="m3-dot absolute left-0 size-3.5 rounded-full border-[3px] border-primary bg-surface-bright"
                style={{ top: AXIS_Y - 12 - 7 }}
              />
            </button>
          );
        }

        const barWidth = Math.max(x(end) - left, 44);
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            aria-pressed={selected}
            aria-label={`${event.title}, ${time(start)}–${time(end)}`}
            title={event.title}
            className={`absolute flex items-center gap-2 overflow-hidden rounded-medium px-2.5 text-left whitespace-nowrap transition-shadow ${
              selected
                ? "bg-primary text-on-primary shadow-[0_10px_24px_#5f59ff55]"
                : "bg-primary-container text-on-primary-container ring-[1.5px] ring-[#c9c7f5] ring-inset hover:ring-primary"
            }`}
            style={{ left, top: AXIS_Y - 30, width: barWidth, height: 60 }}
          >
            {badge}
            {barWidth >= 110 ? (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold">
                  {event.title}
                </span>
                <span
                  className={`text-xs font-semibold ${selected ? "text-on-primary/80" : ""}`}
                >
                  {time(start)} – {time(end)}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
