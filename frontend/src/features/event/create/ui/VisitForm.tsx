"use client";

import { useState } from "react";

import { CATEGORY_ICON, type Event } from "@entities/event";
import {
  type Place,
  PlaceCombobox,
  type StopValue,
  stopName,
  stopToDto,
} from "@entities/place";
import type { Trip } from "@entities/trip";
import type { ActivityCategory, EventInputDto } from "@shared/api";
import { getEventScheduleError } from "@shared/lib";
import { Icon } from "@shared/ui";

import {
  CATEGORY_LABELS,
  FormFooter,
  WhenRow,
  addMinutes,
  blockingEvents,
  localDay,
  localTime,
  spanMinutes,
  suggestSlot,
  toRange,
} from "./EventFormParts";

type Activity = Extract<Event, { type: "activity" }>;

interface VisitFormProps {
  trip: Trip;
  events: Event[];
  places: Place[];
  defaultDay: string;
  category: ActivityCategory;
  defaultMinutes: number;
  pickCategory: boolean;
  placeholder: string;
  autoFocus?: boolean;
  initial?: Activity;
  initialPlace?: { value: StopValue; kind?: string };
  pending: boolean;
  failed: boolean;
  submitLabel: string;
  onSubmit: (data: EventInputDto) => void;
}

const CATEGORY_ORDER: ActivityCategory[] = [
  "excursion",
  "museum",
  "restaurant",
  "walk",
  "theater",
  "meeting",
  "other",
];

const GUESSES: [RegExp, ActivityCategory][] = [
  [
    /restaurant|cafe|fast_food|bar\b|pub|bakery|food|кафе|ресторан|бар\b|кофе|столов|пекарн|бистро|паб/i,
    "restaurant",
  ],
  [/museum|gallery|музей|галере|выставк/i, "museum"],
  [
    /theatre|cinema|concert|arts_centre|театр|опер|балет|филармон|концерт|кино/i,
    "theater",
  ],
  [
    /park|garden|viewpoint|beach|square|pedestrian|парк|набережн|сад\b|сквер|площад|улиц/i,
    "walk",
  ],
];

const guessCategory = (text: string): ActivityCategory =>
  GUESSES.find(([pattern]) => pattern.test(text))?.[1] ?? "excursion";

export function VisitForm({
  trip,
  events,
  places,
  defaultDay,
  category: initialCategory,
  defaultMinutes,
  pickCategory,
  placeholder,
  autoFocus = true,
  initial,
  initialPlace,
  pending,
  failed,
  submitLabel,
  onSubmit,
}: VisitFormProps) {
  const [place, setPlace] = useState<StopValue | null>(
    initial?.place
      ? { kind: "existing", id: initial.place.id }
      : (initialPlace?.value ?? null),
  );
  const [title, setTitle] = useState(
    initial?.title ??
      (initialPlace ? stopName(initialPlace.value, places) : ""),
  );
  const [category, setCategory] = useState(() =>
    initialPlace && pickCategory
      ? guessCategory(
          `${initialPlace.kind ?? ""} ${stopName(initialPlace.value, places)}`,
        )
      : initialCategory,
  );
  const [day, setDay] = useState(
    initial ? localDay(initial.startAt) : defaultDay,
  );
  const [start, setStart] = useState(() =>
    initial ? localTime(initial.startAt) : suggestSlot(defaultDay, events),
  );
  const [end, setEnd] = useState(() =>
    initial
      ? initial.endAt
        ? localTime(initial.endAt)
        : ""
      : addMinutes(suggestSlot(defaultDay, events), defaultMinutes),
  );

  const address =
    place?.kind === "new"
      ? place.place.address
      : place
        ? (places.find((item) => item.id === place.id)?.address ?? null)
        : null;
  const name = title.trim() || stopName(place, places);
  const minutes = spanMinutes(start, end);
  const { startAt, endAt } = toRange(day, start, minutes);
  const ready = Boolean(place) || Boolean(initial);
  const problem = !ready
    ? undefined
    : !start
      ? "Укажите время"
      : getEventScheduleError(startAt, endAt, trip, blockingEvents(events));

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || problem || !name) return;
        onSubmit({
          type: "activity",
          category,
          title: name.slice(0, 200),
          description: initial?.description ?? null,
          bookingUrl: initial?.bookingUrl ?? null,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : null,
          place: place ? stopToDto(place) : null,
        });
      }}
    >
      {place ? (
        <div className="m3-enter flex items-center gap-3 rounded-xlarge border border-outline-variant bg-surface-bright p-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-large bg-primary-container text-primary">
            <Icon name={CATEGORY_ICON[category]} size={22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={stopName(place, places)}
              aria-label="Название"
              maxLength={200}
              className="-mx-1.5 min-w-0 rounded-small bg-transparent px-1.5 py-0.5 text-lg font-extrabold outline-none placeholder:text-on-surface hover:bg-surface-container-low focus:bg-surface-container-low"
            />
            {address ? (
              <span className="flex min-w-0 items-center gap-1 text-sm text-on-surface-variant">
                <Icon name="pin" size={13} className="shrink-0" />
                <span className="truncate">{address}</span>
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => {
              setPlace(null);
              setTitle("");
            }}
            aria-label="Выбрать другое место"
            className="m3-icon-button size-9 shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap">
          <PlaceCombobox
            large
            autoFocus={autoFocus}
            places={places}
            value={place}
            onChange={(value, kind) => {
              setPlace(value);
              const picked = stopName(value, places);
              setTitle(picked);
              if (value && pickCategory)
                setCategory(guessCategory(`${kind ?? ""} ${picked}`));
            }}
            placeholder={placeholder}
          />
        </div>
      )}

      {ready ? (
        <div className="m3-enter flex flex-col gap-4">
          {pickCategory ? (
            <div
              role="radiogroup"
              aria-label="Что это"
              className="flex flex-wrap gap-1.5"
            >
              {CATEGORY_ORDER.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={category === item}
                  onClick={() => setCategory(item)}
                  className="m3-option py-1.5 pr-3 pl-2.5"
                >
                  <Icon name={CATEGORY_ICON[item]} size={15} />
                  {CATEGORY_LABELS[item]}
                </button>
              ))}
            </div>
          ) : null}
          <WhenRow
            trip={trip}
            day={day}
            start={start}
            end={end}
            onDay={(value) => {
              setDay(value);
              if (initial) return;
              const next = suggestSlot(value, events);
              setStart(next);
              setEnd(minutes === null ? "" : addMinutes(next, minutes));
            }}
            onStart={(value) => {
              setStart(value);
              if (value && minutes !== null) setEnd(addMinutes(value, minutes));
            }}
            onEnd={setEnd}
          />
        </div>
      ) : null}

      <FormFooter
        label={submitLabel}
        disabled={!ready || Boolean(problem)}
        pending={pending}
        failed={failed}
        problem={problem}
      />
    </form>
  );
}
