"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import {
  CATEGORY_ICON,
  CATEGORY_TONE,
  type Event,
  TRANSPORT_META,
  TRANSPORT_TONE,
  formatDuration,
} from "@entities/event";
import type { Trip } from "@entities/trip";
import { Icon, type IconName } from "@shared/ui";

interface TripItineraryProps {
  trip: Trip;
  events: Event[];
  numbers: Map<number, number>;
  coverUrl: string;
  selectedId: number | null;
  canEdit: boolean;
  onSelect: (eventId: number) => void;
  onAdd: (day: string) => void;
  onBooking: (tile: string) => void;
  onEditTrip: () => void;
}

const DAY_MS = 86_400_000;

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

const BOOKINGS: {
  tile: string;
  label: string;
  icon: IconName;
  tone: string;
}[] = [
  { tile: "plane", label: "Перелёт", icon: "plane", tone: "lavender" },
  { tile: "train", label: "Поезд", icon: "train", tone: "mint" },
  { tile: "stay", label: "Жильё", icon: "bed", tone: "sky" },
  { tile: "car", label: "Авто", icon: "car", tone: "peach" },
  { tile: "ticket", label: "Из билета", icon: "camera", tone: "violet" },
];

const STATS: { label: string; icon: IconName; tone: string }[] = [
  { label: "Дней", icon: "calendar", tone: "lavender" },
  { label: "Мест", icon: "pin", tone: "mint" },
  { label: "Событий", icon: "star", tone: "rose" },
];

const plural = (count: number, forms: [string, string, string]) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};

const pad = (value: number) => String(value).padStart(2, "0");
const keyOf = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

const isStay = (event: Event) =>
  event.type === "activity" &&
  event.category === "accommodation" &&
  Boolean(event.endAt) &&
  Date.parse(event.endAt ?? "") - Date.parse(event.startAt) >= 6 * 3_600_000;

function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const a =
    Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 +
    Math.cos(rad(from.latitude)) *
      Math.cos(rad(to.latitude)) *
      Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(a));
}

function TravelHint({ km }: { km: number }) {
  const walk = km <= 2.5;
  const minutes = Math.max(
    5,
    Math.round(((km * 1.3) / (walk ? 4.5 : 28)) * 12) * 5,
  );
  return (
    <li className="m3-plan-hint">
      <Icon name={walk ? "walk" : "car"} size={14} />
      {formatDuration(minutes * 60_000)} ·{" "}
      {km < 1
        ? `${Math.round(km * 1000)} м`
        : `${km.toFixed(1).replace(".", ",")} км`}
    </li>
  );
}

export function TripItinerary({
  trip,
  events,
  numbers,
  coverUrl,
  selectedId,
  canEdit,
  onSelect,
  onAdd,
  onBooking,
  onEditTrip,
}: TripItineraryProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const daysRef = useRef<HTMLElement>(null);

  const first = new Date(`${trip.startDate}T00:00:00`);
  const count =
    Math.round(
      (Date.parse(`${trip.endDate}T12:00:00`) -
        Date.parse(`${trip.startDate}T12:00:00`)) /
        DAY_MS,
    ) + 1;
  const days = Array.from({ length: Math.max(count, 1) }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
  const sorted = [...events].sort(
    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
  );
  const places = new Set(
    sorted.flatMap((event) =>
      event.type === "movement"
        ? [event.fromPlace.id, event.toPlace.id]
        : event.place
          ? [event.place.id]
          : [],
    ),
  ).size;

  const today = new Date().setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((first.getTime() - today) / DAY_MS);
  const dayKeys = days.map(keyOf).join(",");

  useEffect(() => {
    const sections = dayKeys
      .split(",")
      .map((key) => document.getElementById(`plan-day-${key}`))
      .filter((element): element is HTMLElement => Boolean(element));
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.id.replace("plan-day-", "");
          if (entry.isIntersecting)
            visible.set(key, entry.boundingClientRect.top);
          else visible.delete(key);
        });
        const next = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        if (next) setActiveKey(next[0]);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [dayKeys]);

  useEffect(() => {
    const nav = daysRef.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !chip) return;
    nav.scrollTo({
      left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activeKey]);

  const scrollTo = (key: string) => {
    setActiveKey(key);
    document
      .getElementById(`plan-day-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="m3-plan-doc">
      <div className="m3-plan-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" />
        {daysLeft > 0 ? (
          <span className="m3-pill-badge m3-plan-cover-badge">
            <Icon name="sparkle" size={14} />
            Через {daysLeft} {plural(daysLeft, ["день", "дня", "дней"])}
          </span>
        ) : null}
        <div className="m3-plan-cover-text">
          <h1>{trip.title}</h1>
          <p>
            <Icon name="calendar" size={15} />
            {first.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
            {" – "}
            {new Date(`${trip.endDate}T12:00:00`).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
            <span aria-hidden="true">·</span>
            <Icon name="globe" size={15} />
            {trip.country}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={onEditTrip}
            className="m3-plan-cover-edit"
            aria-label="Изменить поездку"
          >
            <Icon name="edit" size={16} />
          </button>
        ) : null}
      </div>

      <dl className="m3-plan-stats">
        {STATS.map(({ label, icon, tone }, index) => (
          <div key={label}>
            <span data-tone={tone} className="m3-tone-tile size-10">
              <Icon name={icon} size={18} />
            </span>
            <span className="min-w-0">
              <dt>{label}</dt>
              <dd>{[days.length, places, sorted.length][index]}</dd>
            </span>
          </div>
        ))}
      </dl>

      {trip.description ? (
        <p className="m3-plan-note">{trip.description}</p>
      ) : null}

      {canEdit ? (
        <section aria-label="Бронирования" className="m3-plan-block">
          <h2>Бронирования</h2>
          <div className="m3-plan-bookings">
            {BOOKINGS.map((item) => (
              <button
                key={item.tile}
                type="button"
                onClick={() => onBooking(item.tile)}
              >
                <span data-tone={item.tone} className="m3-tone-tile">
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <nav ref={daysRef} aria-label="Дни" className="m3-plan-days">
        {days.map((date, index) => (
          <button
            key={keyOf(date)}
            type="button"
            aria-current={(activeKey ?? keyOf(days[0])) === keyOf(date)}
            onClick={() => scrollTo(keyOf(date))}
          >
            <b>{index + 1}</b>
            {date.toLocaleDateString("ru-RU", {
              weekday: "short",
              day: "numeric",
            })}
          </button>
        ))}
      </nav>

      {days.map((date, index) => {
        const key = keyOf(date);
        const start = date.getTime();
        const end = start + DAY_MS;
        const items = sorted.filter((event) => {
          const at = Date.parse(event.startAt);
          return at >= start && at < end;
        });
        const night = sorted.find(
          (event) =>
            isStay(event) &&
            Date.parse(event.startAt) < start &&
            Date.parse(event.endAt ?? "") > start,
        );
        let previous: Event | null = null;

        return (
          <section
            key={key}
            id={`plan-day-${key}`}
            className="m3-plan-day"
            aria-labelledby={`plan-day-title-${key}`}
          >
            <header>
              <div className="min-w-0">
                <small>День {index + 1}</small>
                <h2 id={`plan-day-title-${key}`}>
                  {date.toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
              </div>
              {items.length ? (
                <span>
                  {items.length}{" "}
                  {plural(items.length, ["событие", "события", "событий"])}
                </span>
              ) : null}
            </header>

            {night ? (
              <button
                type="button"
                onClick={() => onSelect(night.id)}
                className="m3-plan-night"
              >
                <Icon name="bed" size={15} />
                <span>Ночь в «{night.title}»</span>
              </button>
            ) : null}

            <ol className="m3-plan-list">
              {items.map((event) => {
                const before = previous;
                previous = event;
                const selected = event.id === selectedId;

                if (event.type === "movement") {
                  const meta =
                    TRANSPORT_META[event.transportType] ?? TRANSPORT_META.other;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(event.id)}
                        aria-pressed={selected}
                        className="m3-plan-move"
                      >
                        <span
                          className="m3-plan-move-icon"
                          data-tone={
                            TRANSPORT_TONE[event.transportType] ??
                            TRANSPORT_TONE.other
                          }
                        >
                          <Icon name={meta.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b>{event.title}</b>
                          <span className="m3-meta">
                            <Icon name="clock" size={13} />
                            {time(event.startAt)}
                            {event.endAt
                              ? ` – ${time(event.endAt)} · ${formatDuration(Date.parse(event.endAt) - Date.parse(event.startAt))}`
                              : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                }

                const number = event.place
                  ? numbers.get(event.place.id)
                  : undefined;
                const hintFrom =
                  before?.type === "activity" ? before.place : null;
                const km =
                  hintFrom && event.place && hintFrom.id !== event.place.id
                    ? distanceKm(hintFrom, event.place)
                    : null;

                return (
                  <Fragment key={event.id}>
                    {km !== null && km < 60 ? <TravelHint km={km} /> : null}
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelect(event.id)}
                        aria-pressed={selected}
                        data-tone={CATEGORY_TONE[event.category]}
                        className="m3-plan-item"
                      >
                        <span className="m3-plan-pin">
                          {number ?? (
                            <Icon
                              name={CATEGORY_ICON[event.category]}
                              size={13}
                            />
                          )}
                        </span>
                        <span className="m3-plan-card">
                          <span className="m3-plan-card-body">
                            <b>{event.title}</b>
                            <span className="m3-plan-card-meta">
                              <span className="m3-tag">
                                {CATEGORY_LABELS[event.category]}
                              </span>
                              <span className="m3-meta">
                                <Icon name="clock" size={13} />
                                {time(event.startAt)}
                                {event.endAt ? ` – ${time(event.endAt)}` : ""}
                              </span>
                            </span>
                            {event.place?.address ? (
                              <span className="m3-plan-card-address">
                                {event.place.address}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className="m3-tone-tile m3-plan-thumb"
                            aria-hidden="true"
                          >
                            <Icon
                              name={CATEGORY_ICON[event.category]}
                              size={22}
                            />
                          </span>
                        </span>
                      </button>
                    </li>
                  </Fragment>
                );
              })}
            </ol>

            {!items.length && !night ? (
              <p className="m3-plan-empty">Свободный день</p>
            ) : null}

            {canEdit ? (
              <button
                type="button"
                onClick={() => onAdd(key)}
                className="m3-plan-add"
              >
                <span aria-hidden="true">
                  <Icon name="plus" size={16} />
                </span>
                Добавить место
              </button>
            ) : null}
          </section>
        );
      })}

      <p className="m3-plan-end">
        <Icon name="check" size={14} />
        Конец поездки
      </p>
    </div>
  );
}
