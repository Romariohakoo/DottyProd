"use client";

import { Icon } from "@shared/ui";

import type { Event } from "../model";
import {
  CATEGORY_ICON,
  TRANSPORT_META,
  formatDuration,
} from "./event-day-timeline";

interface EventListProps {
  events: Event[];
  onSelect: (eventId: number) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  excursion: "Экскурсия",
  museum: "Музей",
  theater: "Театр",
  walk: "Прогулка",
  accommodation: "Жильё",
  restaurant: "Еда",
  meeting: "Встреча",
  other: "Другое",
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

const dayOf = (iso: string) => new Date(iso).toDateString();

const subtitle = (event: Event) => {
  const span = event.endAt
    ? formatDuration(Date.parse(event.endAt) - Date.parse(event.startAt))
    : "";
  if (event.type === "movement")
    return [`${event.fromPlace.name} → ${event.toPlace.name}`, span]
      .filter(Boolean)
      .join(" · ");
  const where =
    event.place?.address ??
    (event.place && event.place.name !== event.title ? event.place.name : "");
  return [CATEGORY_LABELS[event.category], where].filter(Boolean).join(" · ");
};

export function EventList({ events, onSelect }: EventListProps) {
  const days = new Map<string, Event[]>();
  [...events]
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))
    .forEach((event) => {
      const key = dayOf(event.startAt);
      days.set(key, [...(days.get(key) ?? []), event]);
    });

  return (
    <div className="flex flex-col gap-8">
      {[...days.values()].map((items) => (
        <section key={items[0].id} className="flex flex-col gap-1">
          <h3 className="px-3 pb-1 text-lg font-extrabold first-letter:uppercase">
            {new Date(items[0].startAt).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <ul className="flex flex-col">
            {items.map((event) => {
              const icon =
                event.type === "movement"
                  ? (
                      TRANSPORT_META[event.transportType] ??
                      TRANSPORT_META.other
                    ).icon
                  : CATEGORY_ICON[event.category];
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event.id)}
                    className="group flex w-full items-center gap-4 rounded-large px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span className="w-14 shrink-0 text-sm font-extrabold tabular-nums">
                      {time(event.startAt)}
                      {event.endAt ? (
                        <span className="block font-semibold text-on-surface-variant">
                          {time(event.endAt)}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${
                        event.type === "movement"
                          ? "bg-surface-container text-on-surface"
                          : "bg-primary-container text-primary"
                      }`}
                    >
                      <Icon name={icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-extrabold">
                        {event.title}
                      </b>
                      <span className="block truncate text-sm text-on-surface-variant">
                        {subtitle(event)}
                      </span>
                    </span>
                    <Icon
                      name="next"
                      size={18}
                      className="shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
