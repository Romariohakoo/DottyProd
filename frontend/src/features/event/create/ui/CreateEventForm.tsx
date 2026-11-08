"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type Event, formatDuration } from "@entities/event";
import {
  type Place,
  PlaceCombobox,
  type StopValue,
  isHubPlace,
  sameStop,
  stopCoords,
  stopName,
  stopToDto,
} from "@entities/place";
import type { Trip } from "@entities/trip";
import api, {
  type ActivityCategory,
  type EventDto,
  type EventInputDto,
  type TransportType,
  tripQueryKeys,
} from "@shared/api";
import { getEventScheduleError } from "@shared/lib";
import { Icon, type IconName } from "@shared/ui";

import { createEvent } from "../api/create-event";
import {
  DaySelect,
  FormFooter,
  addMinutes,
  blockingEvents,
  dayLabel,
  distanceKm,
  estimateMinutes,
  formatKm,
  localDay,
  localTime,
  minutesBetween,
  suggestSlot,
  tripDays,
} from "./EventFormParts";
import { VisitForm } from "./VisitForm";

interface CreateEventFormProps {
  tripId: number;
  trip: Trip;
  events: Event[];
  places: Place[];
  defaultDay?: string;
  editing?: Event;
  initialTile?: string;
  onOpenTicket?: () => void;
  onSuccess?: () => void;
}

type Kind =
  | { id: string; group: "move"; transport: TransportType }
  | { id: string; group: "stay" }
  | {
      id: string;
      group: "do";
      category: ActivityCategory;
      minutes: number;
      placeholder: string;
    };

const TILES: (Kind & { label: string; icon: IconName; tone: string })[] = [
  {
    id: "plane",
    group: "move",
    transport: "plane",
    label: "Перелёт",
    icon: "plane",
    tone: "lavender",
  },
  {
    id: "train",
    group: "move",
    transport: "train",
    label: "Поезд",
    icon: "train",
    tone: "mint",
  },
  {
    id: "car",
    group: "move",
    transport: "car",
    label: "Авто",
    icon: "car",
    tone: "peach",
  },
  {
    id: "walk",
    group: "move",
    transport: "walk",
    label: "Пешком",
    icon: "walk",
    tone: "slate",
  },
  { id: "stay", group: "stay", label: "Жильё", icon: "bed", tone: "sky" },
  {
    id: "visit",
    group: "do",
    category: "excursion",
    minutes: 60,
    placeholder: "Название места или адрес",
    label: "Место",
    icon: "pin",
    tone: "lavender",
  },
];

const TRANSPORT_WORD: Record<TransportType, string> = {
  plane: "Перелёт",
  train: "Поезд",
  car: "Авто",
  walk: "Пешком",
  other: "Дорога",
};

const TRANSPORT_ICON: Record<TransportType, IconName> = {
  plane: "plane",
  train: "train",
  car: "car",
  walk: "walk",
  other: "bus",
};

const tileFor = (event: Event) => {
  if (event.type === "movement")
    return (
      TILES.find((tile) => tile.id === event.transportType) ??
      TILES.find((tile) => tile.id === "car")
    );
  if (event.category === "accommodation")
    return TILES.find((tile) => tile.id === "stay");
  return TILES.find((tile) => tile.id === "visit");
};

export function CreateEventForm({
  tripId,
  trip,
  events,
  places,
  defaultDay,
  editing,
  initialTile,
  onOpenTicket,
  onSuccess,
}: CreateEventFormProps) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: EventInputDto) =>
      editing
        ? api
            .put<EventDto>(`/trips/${tripId}/events/${editing.id}`, data)
            .then((response) => response.data)
        : createEvent(tripId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
      onSuccess?.();
    },
  });
  const [tileId, setTileId] = useState<string | null>(
    editing
      ? (tileFor(editing)?.id ?? null)
      : (TILES.find((tile) => tile.id === initialTile)?.id ?? null),
  );
  const [picked, setPicked] = useState<{
    value: StopValue;
    kind?: string;
  } | null>(null);
  const tile = TILES.find((item) => item.id === tileId);

  if (!tile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap">
          <PlaceCombobox
            large
            autoFocus
            places={places}
            value={null}
            onChange={(value, kind) => {
              if (!value) return;
              setPicked({ value, kind });
              setTileId("visit");
            }}
            placeholder="Название места или адрес"
          />
        </div>
        <div role="list" className="grid grid-cols-3 gap-2">
          {TILES.filter((item) => item.id !== "visit").map((item) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              onClick={() => setTileId(item.id)}
              data-tone={item.tone}
              className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-large bg-tone-bg text-tone-fg transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Icon name={item.icon} size={24} />
              <span className="text-sm font-extrabold">{item.label}</span>
            </button>
          ))}
          {onOpenTicket ? (
            <button
              type="button"
              role="listitem"
              onClick={onOpenTicket}
              className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xlarge bg-on-surface text-surface-bright transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Icon name="camera" size={24} />
              <span className="text-sm font-extrabold">Из билета</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const others = editing
    ? events.filter((event) => event.id !== editing.id)
    : events;
  const common = {
    trip,
    events: others,
    places,
    defaultDay: defaultDay ?? trip.startDate,
    pending: isPending,
    failed: Boolean(error),
    submitLabel: editing ? "Сохранить" : "Добавить",
    onSubmit: (data: EventInputDto) => mutate(data),
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex items-center gap-3 ${editing && tile.id === "visit" ? "hidden" : ""}`}
      >
        {editing ? null : (
          <button
            type="button"
            onClick={() => {
              setTileId(null);
              setPicked(null);
            }}
            aria-label="Все типы"
            className="m3-icon-button"
          >
            <Icon name="back" size={18} />
          </button>
        )}
        <span
          data-tone={tile.tone}
          className="grid size-10 place-items-center rounded-full bg-tone-bg text-tone-fg"
        >
          <Icon name={tile.icon} size={18} />
        </span>
        <b className="text-lg font-extrabold">{tile.label}</b>
      </div>
      {tile.group === "move" ? (
        <MovementCard
          key={tile.id}
          transport={
            editing?.type === "movement"
              ? editing.transportType
              : tile.transport
          }
          initial={editing?.type === "movement" ? editing : undefined}
          {...common}
        />
      ) : tile.group === "stay" ? (
        <StayCard
          initial={editing?.type === "activity" ? editing : undefined}
          {...common}
        />
      ) : (
        <VisitForm
          key={tile.id}
          category={
            editing?.type === "activity" ? editing.category : tile.category
          }
          defaultMinutes={tile.minutes}
          pickCategory={Boolean(editing) || tile.id === "visit"}
          placeholder={tile.placeholder}
          initialPlace={picked ?? undefined}
          autoFocus={!editing}
          initial={editing?.type === "activity" ? editing : undefined}
          {...common}
        />
      )}
    </div>
  );
}

interface CardProps {
  trip: Trip;
  events: Event[];
  places: Place[];
  defaultDay: string;
  pending: boolean;
  failed: boolean;
  submitLabel: string;
  onSubmit: (data: EventInputDto) => void;
}

const existing = (id: number | undefined): StopValue | null =>
  id === undefined ? null : { kind: "existing", id };

const FREE_DURATIONS = [15, 30, 45, 60, 90, 120];

const shortDuration = (minutes: number) =>
  minutes < 60
    ? `${minutes} мин`
    : minutes % 60
      ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
      : `${minutes / 60} ч`;

function MovementCard({
  trip,
  events,
  places,
  defaultDay,
  pending,
  failed,
  submitLabel,
  onSubmit,
  transport,
  initial,
}: CardProps & {
  transport: TransportType;
  initial?: Extract<Event, { type: "movement" }>;
}) {
  const scheduled = transport === "plane" || transport === "train";
  const hubKind =
    transport === "plane"
      ? "airport"
      : transport === "train"
        ? "station"
        : null;
  const dayStart = (day: string) => Date.parse(`${day}T00:00:00`);
  const lastPlaceOf = (day: string) =>
    blockingEvents(events)
      .filter((event) => {
        const time = Date.parse(event.startAt);
        return time >= dayStart(day) && time < dayStart(day) + 86_400_000;
      })
      .sort(
        (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
      )
      .flatMap((event) =>
        event.type === "movement"
          ? [event.toPlace]
          : event.place
            ? [event.place]
            : [],
      )
      .filter((place) => !hubKind || isHubPlace(place.name, hubKind))
      .at(-1)?.id;

  const [day, setDay] = useState(
    initial ? localDay(initial.startAt) : defaultDay,
  );
  const [from, setFrom] = useState<StopValue | null>(
    existing(initial ? initial.fromPlace.id : lastPlaceOf(defaultDay)),
  );
  const [to, setTo] = useState<StopValue | null>(existing(initial?.toPlace.id));
  const [departure, setDeparture] = useState(() =>
    initial ? localTime(initial.startAt) : suggestSlot(defaultDay, events),
  );
  const [arrival, setArrival] = useState<string | null>(
    initial?.endAt ? localTime(initial.endAt) : null,
  );
  const [duration, setDuration] = useState<number | null>(
    initial ? minutesBetween(initial.startAt, initial.endAt) : null,
  );
  const [number, setNumber] = useState("");

  const fromCoords = stopCoords(from, places);
  const toCoords = stopCoords(to, places);
  const km =
    fromCoords && toCoords && !sameStop(from, to)
      ? distanceKm(fromCoords, toCoords)
      : null;
  const estimate = km !== null ? estimateMinutes(km, transport) : null;

  const minutes = scheduled
    ? arrival
      ? (() => {
          const value = minutesBetween(
            `${day}T${departure}`,
            `${day}T${arrival}`,
          );
          return value !== null && value < 0 ? value + 1440 : value;
        })()
      : estimate
    : (duration ?? estimate ?? 30);
  const arrivalShown =
    scheduled && arrival
      ? arrival
      : departure && minutes !== null
        ? addMinutes(departure, minutes)
        : "";
  const arrivalEstimated = scheduled ? !arrival : duration === null;

  const startAt = departure ? `${day}T${departure}` : "";
  const endDate =
    startAt && minutes !== null
      ? new Date(Date.parse(startAt) + minutes * 60_000)
      : null;
  const word = TRANSPORT_WORD[transport];
  const depLabel =
    transport === "plane"
      ? "вылет"
      : transport === "train"
        ? "отправление"
        : transport === "walk"
          ? "выход"
          : "выезд";
  const arrLabel = transport === "plane" ? "прилёт" : "прибытие";

  const problem =
    !from || !to
      ? undefined
      : sameStop(from, to)
        ? "Откуда и куда совпадают"
        : startAt
          ? getEventScheduleError(
              startAt,
              endDate ? endDate.toISOString() : "",
              trip,
              blockingEvents(events),
            )
          : "Укажите время";

  const caption = (text: string, estimated = false) => (
    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-on-surface-variant uppercase">
      {text}
      {estimated ? <span className="text-primary normal-case">≈</span> : null}
    </span>
  );

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (problem || !from || !to || !startAt) return;
        onSubmit({
          type: "movement",
          transportType: transport,
          title:
            initial?.title ??
            `${word}${scheduled && number.trim() ? ` ${number.trim().toUpperCase()}` : ""}: ${stopName(from, places)} → ${stopName(to, places)}`.slice(
              0,
              200,
            ),
          description: initial?.description ?? null,
          bookingUrl: initial?.bookingUrl ?? null,
          startAt: new Date(startAt).toISOString(),
          endAt: endDate ? endDate.toISOString() : null,
          fromPlace: stopToDto(from),
          toPlace: stopToDto(to),
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DaySelect
          trip={trip}
          value={day}
          onChange={(value) => {
            setDay(value);
            if (!initial) {
              setDeparture(suggestSlot(value, events));
              setFrom(existing(lastPlaceOf(value)));
            }
          }}
        />
        {scheduled && !initial ? (
          <label className="flex items-center gap-2 rounded-full bg-surface-container py-1 pr-1 pl-3 text-sm font-bold text-on-surface-variant">
            {transport === "plane" ? "Рейс" : "№"}
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder={transport === "plane" ? "SU 1270" : "6333"}
              className="w-24 rounded-full bg-surface-bright px-3 py-1 text-on-surface uppercase outline-none"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-col rounded-xlarge border border-outline-variant px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3">
          <span className="size-3.5 shrink-0 rounded-full border-[3px] border-on-surface bg-surface-bright" />
          <PlaceCombobox
            places={places}
            value={from}
            onChange={setFrom}
            placeholder="Откуда?"
            hubKind={hubKind}
            autoFocus={!initial && !from}
          />
          <label className="flex w-28 shrink-0 flex-col items-end gap-0.5">
            {caption(depLabel)}
            <input
              type="time"
              value={departure}
              onChange={(event) => setDeparture(event.target.value)}
              className="m3-time h-9 w-full"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 py-1 pl-[5px]">
          <span className="h-10 border-l-2 border-dashed border-outline" />
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-on-surface-variant">
            <Icon name={TRANSPORT_ICON[transport]} size={16} />
            {km !== null ? formatKm(km) : null}
            {km !== null && minutes !== null ? " · " : null}
            {minutes !== null ? formatDuration(minutes * 60_000) : null}
          </span>
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Поменять местами"
            className="m3-icon-button size-8"
          >
            <Icon name="swap" size={15} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3">
          <span className="size-3.5 shrink-0 rounded-full bg-primary" />
          <PlaceCombobox
            places={places}
            value={to}
            onChange={setTo}
            placeholder="Куда?"
            hubKind={hubKind}
            autoFocus={!initial && Boolean(from)}
          />
          {scheduled ? (
            <label className="flex w-28 shrink-0 flex-col items-end gap-0.5">
              {caption(arrLabel, arrivalEstimated && Boolean(arrivalShown))}
              <input
                type="time"
                value={arrivalShown}
                onChange={(event) => setArrival(event.target.value || null)}
                className={`m3-time h-9 w-full ${arrivalEstimated ? "text-on-surface-variant" : ""}`}
              />
            </label>
          ) : (
            <span className="flex w-28 shrink-0 flex-col items-end gap-0.5">
              {caption(arrLabel, arrivalEstimated)}
              <span className="flex h-9 items-center px-1 font-bold text-on-surface-variant tabular-nums">
                {arrivalShown || "—"}
              </span>
            </span>
          )}
        </div>
      </div>

      {scheduled ? null : (
        <div
          role="radiogroup"
          aria-label="В пути"
          className="flex flex-wrap gap-1.5"
        >
          {[...new Set([...(estimate ? [estimate] : []), ...FREE_DURATIONS])]
            .sort((left, right) => left - right)
            .map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={minutes === value}
                onClick={() => setDuration(value)}
                className="m3-option shrink-0 px-3 py-1.5"
              >
                {value === estimate ? <Icon name="sparkle" size={13} /> : null}
                {shortDuration(value)}
              </button>
            ))}
        </div>
      )}

      <FormFooter
        label={submitLabel}
        disabled={Boolean(problem) || !from || !to}
        pending={pending}
        failed={failed}
        problem={problem}
      />
    </form>
  );
}

function StayCard({
  trip,
  places,
  defaultDay,
  pending,
  failed,
  submitLabel,
  onSubmit,
  initial,
}: CardProps & { initial?: Extract<Event, { type: "activity" }> }) {
  const days = tripDays(trip);
  const [place, setPlace] = useState<StopValue | null>(() => {
    if (initial) return existing(initial.place?.id);
    const hotel = places.find((item) =>
      /отел|гостин|hotel|хостел|апарт|квартир/i.test(item.name),
    );
    return existing(hotel?.id);
  });
  const [checkIn, setCheckIn] = useState(
    initial
      ? { day: localDay(initial.startAt), time: localTime(initial.startAt) }
      : { day: defaultDay, time: "14:00" },
  );
  const [checkOut, setCheckOut] = useState(
    initial?.endAt
      ? { day: localDay(initial.endAt), time: localTime(initial.endAt) }
      : {
          day:
            days[Math.min(days.indexOf(defaultDay) + 1, days.length - 1)] ??
            defaultDay,
          time: "12:00",
        },
  );
  const startAt = `${checkIn.day}T${checkIn.time}`;
  const endAt = `${checkOut.day}T${checkOut.time}`;
  const nights = Math.round(
    (Date.parse(`${checkOut.day}T12:00:00`) -
      Date.parse(`${checkIn.day}T12:00:00`)) /
      86_400_000,
  );
  const problem = !place
    ? undefined
    : endAt <= startAt
      ? "Выезд должен быть позже заезда"
      : getEventScheduleError(startAt, endAt, trip, []);

  const slot = (
    label: string,
    value: { day: string; time: string },
    onChange: (value: { day: string; time: string }) => void,
  ) => (
    <div className="flex flex-1 flex-col gap-2 rounded-large bg-surface-container-low p-3.5">
      <span className="m3-ticket-key">{label}</span>
      <select
        value={value.day}
        onChange={(event) => onChange({ ...value, day: event.target.value })}
        aria-label={`${label}: день`}
        className="cursor-pointer bg-transparent text-lg font-extrabold outline-none"
      >
        {days.map((day) => (
          <option key={day} value={day}>
            {dayLabel(day)}
          </option>
        ))}
      </select>
      <input
        type="time"
        value={value.time}
        onChange={(event) => onChange({ ...value, time: event.target.value })}
        aria-label={`${label}: время`}
        className="m3-time self-start"
      />
    </div>
  );

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (problem || !place) return;
        onSubmit({
          type: "activity",
          category: "accommodation",
          title: (initial?.title ?? stopName(place, places)).slice(0, 200),
          description: initial?.description ?? null,
          bookingUrl: initial?.bookingUrl ?? null,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          place: stopToDto(place),
        });
      }}
    >
      <div className="flex flex-wrap">
        <PlaceCombobox
          large
          autoFocus={!initial && !place}
          places={places}
          value={place}
          onChange={setPlace}
          placeholder="Отель или адрес"
        />
      </div>
      <div className="flex items-stretch gap-2">
        {slot("Заезд", checkIn, setCheckIn)}
        <span className="flex flex-col items-center justify-center gap-1 px-1 text-center">
          <Icon name="bed" size={18} className="text-primary" />
          <b className="text-sm font-extrabold whitespace-nowrap">
            {nights > 0
              ? `${nights} ${nights === 1 ? "ночь" : nights < 5 ? "ночи" : "ночей"}`
              : "—"}
          </b>
        </span>
        {slot("Выезд", checkOut, setCheckOut)}
      </div>
      <FormFooter
        label={submitLabel}
        disabled={Boolean(problem) || !place}
        pending={pending}
        failed={failed}
        problem={problem}
      />
    </form>
  );
}
