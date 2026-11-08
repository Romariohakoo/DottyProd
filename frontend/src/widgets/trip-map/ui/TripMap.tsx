"use client";

import { useState } from "react";

import type { LngLat } from "ymaps3";

import type { Event } from "@entities/event";
import { type Place, PlaceMap, type PlaceMapRoute } from "@entities/place";
import { Icon } from "@shared/ui";

interface TripMapProps {
  places: Place[];
  events?: Event[];
  numbers?: Map<number, number>;
  selectedPlaceId?: number | null;
  selectedEventId?: number | null;
  onSelectEvent?: (id: number) => void;
  showOrganizations?: boolean;
  picking?: boolean;
  onSelectCoordinates?: (coordinates: LngLat) => void;
  onUnavailablePoi?: () => void;
  className?: string;
}

const CONNECTION_DASH = [4, 8];
const EVENT_ROW_STEP = 36;

const eventTime = (value: string) =>
  new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

const positionKey = (place: Place) => `${place.longitude},${place.latitude}`;
const entryPlace = (event: Event) =>
  event.type === "movement" ? event.fromPlace : event.place;
const exitPlace = (event: Event) =>
  event.type === "movement" ? event.toPlace : event.place;

export function TripMap({
  places,
  events,
  numbers,
  selectedPlaceId,
  selectedEventId,
  onSelectEvent,
  showOrganizations,
  picking,
  onSelectCoordinates,
  onUnavailablePoi,
  className,
}: TripMapProps) {
  const orderedEvents = [...(events ?? [])].sort(
    (left, right) =>
      Date.parse(left.startAt) - Date.parse(right.startAt) ||
      left.id - right.id,
  );
  const [stackScroll, setStackScroll] = useState<Map<string, number>>(
    new Map(),
  );
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(
    new Set(),
  );
  // One marker per coordinate keeps different places at the same point selectable.
  const positions = new Map<string, Place>();
  places.forEach((place) => {
    if (!positions.has(positionKey(place)))
      positions.set(positionKey(place), place);
  });
  const visitsByPosition = new Map(
    [...positions].map(
      ([key]) =>
        [
          key,
          orderedEvents.flatMap((event, index) => {
            const relatedPlaces =
              event.type === "movement"
                ? [event.fromPlace, event.toPlace]
                : event.place
                  ? [event.place]
                  : [];
            const place = relatedPlaces.find(
              (related) => positionKey(related) === key,
            );
            return place ? [{ event, index, place }] : [];
          }),
        ] as const,
    ),
  );
  const stackKey = (place: Place) =>
    `${positionKey(place)}:${
      visitsByPosition
        .get(positionKey(place))
        ?.map(({ event }) => event.id)
        .join(",") ?? ""
    }`;
  const eventOffset = (eventId: number, place: Place) => {
    if (!onSelectEvent) return 0;
    const key = positionKey(place);
    const visits = visitsByPosition.get(key) ?? [];
    const index = visits.findIndex(({ event }) => event.id === eventId);
    // Collapsed groups share the place anchor; expanded routes follow their row.
    return index < 0 || visits.length < 2 || !expandedPositions.has(key)
      ? 0
      : -(index + 1) * EVENT_ROW_STEP - (stackScroll.get(stackKey(place)) ?? 0);
  };
  const routes: PlaceMapRoute[] = [];
  const routeOffsets = new Map<number, [number, number]>();
  const selectedRouteIds = new Set<number>();
  const addRoute = (
    id: number,
    from: Place,
    to: Place,
    fromEventId: number,
    toEventId: number,
    dash?: number[],
    selectable = true,
  ) => {
    if (positionKey(from) === positionKey(to)) return;
    routes.push({
      id,
      from: [from.longitude, from.latitude],
      to: [to.longitude, to.latitude],
      dash,
    });
    routeOffsets.set(id, [
      eventOffset(fromEventId, from),
      eventOffset(toEventId, to),
    ]);
    if (
      selectable &&
      (fromEventId === selectedEventId || toEventId === selectedEventId)
    )
      selectedRouteIds.add(id);
  };
  orderedEvents.forEach((event) => {
    if (event.type === "movement") {
      addRoute(event.id, event.fromPlace, event.toPlace, event.id, event.id);
    }
  });
  orderedEvents.forEach((event, index) => {
    const next = orderedEvents[index + 1];
    if (!next) return;
    const from = exitPlace(event);
    const to = entryPlace(next);
    if (from && to)
      addRoute(-event.id, from, to, event.id, next.id, CONNECTION_DASH, false);
  });

  const selectedPlace = places.find((place) => place.id === selectedPlaceId);
  const selectedMarker = selectedPlace
    ? positions.get(positionKey(selectedPlace))
    : undefined;

  return (
    <section
      className={`relative flex min-w-0 flex-col ${className ?? "gap-3"}`}
      aria-label="Места на карте"
    >
      <PlaceMap
        places={[...positions.values()]}
        numbers={numbers}
        selectedPlaceId={selectedMarker?.id ?? selectedPlaceId}
        routes={routes}
        routeOffsets={routeOffsets}
        selectedRouteIds={selectedRouteIds}
        showOrganizations={showOrganizations}
        picking={picking}
        onSelectCoordinates={onSelectCoordinates}
        onUnavailablePoi={onUnavailablePoi}
        onPlaceClick={
          onSelectEvent
            ? (place, mouseEvent) => {
                if (!(mouseEvent.target instanceof Element)) return;
                const button = mouseEvent.target.closest<HTMLButtonElement>(
                  "button[data-event-id]",
                );
                if (!button) return;
                const id = Number(button.dataset.eventId);
                const event = orderedEvents.find((item) => item.id === id);
                if (
                  event &&
                  [entryPlace(event), exitPlace(event)].some(
                    (related) =>
                      related && positionKey(related) === positionKey(place),
                  )
                )
                  onSelectEvent(id);
              }
            : undefined
        }
        renderPlaceContent={
          onSelectEvent
            ? (place) => {
                const key = positionKey(place);
                const visits = visitsByPosition.get(key) ?? [];
                if (!visits.length) {
                  return (
                    <span
                      role="img"
                      aria-label={[place.name, place.address]
                        .filter(Boolean)
                        .join(", ")}
                      title={place.name}
                      className="grid size-8 translate-x-2 translate-y-4 place-items-center rounded-full border-[3px] border-surface-bright bg-on-surface text-sm font-extrabold text-surface-bright shadow-lg"
                    >
                      {numbers?.get(place.id) ?? "•"}
                    </span>
                  );
                }
                if (visits.length === 1) {
                  const visit = visits[0];
                  const selected = visit.event.id === selectedEventId;
                  return (
                    <button
                      type="button"
                      data-event-id={visit.event.id}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectEvent(visit.event.id);
                      }}
                      aria-pressed={selected}
                      aria-label={`${visit.event.title}, ${visit.place.name}, ${new Date(visit.event.startAt).toLocaleString("ru-RU")}`}
                      title={visit.event.title}
                      className={`flex h-8 max-w-52 translate-y-6 items-center gap-2 rounded-full border-2 border-surface-bright shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "bg-primary pr-3 text-on-primary ring-4 ring-primary/20" : "bg-surface-bright text-on-surface hover:bg-primary-container"}`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${selected ? "bg-primary text-on-primary" : "bg-on-surface text-surface-bright"}`}
                      >
                        {numbers?.get(visit.place.id) ?? "•"}
                      </span>
                      {selected ? (
                        <span className="truncate text-xs font-bold">
                          {eventTime(visit.event.startAt)} · {visit.event.title}
                        </span>
                      ) : null}
                    </button>
                  );
                }

                const expanded = expandedPositions.has(key);
                const selectedGroup = visits.some(
                  ({ event }) => event.id === selectedEventId,
                );
                const listId = `place-events-${place.id}`;
                return (
                  <div
                    key={stackKey(place)}
                    className="flex max-h-80 translate-y-6 flex-col-reverse items-start gap-1 rounded-small p-2"
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={expanded ? listId : undefined}
                      aria-label={`${expanded ? "Свернуть" : "Развернуть"} ${visits.length} событий в месте ${place.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedPositions((previous) => {
                          const next = new Set(previous);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      }}
                      className={`flex h-8 items-center rounded-full border-2 border-surface-bright shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedGroup && !expanded ? "bg-primary text-on-primary ring-4 ring-primary/20" : "bg-surface-bright text-on-surface hover:bg-primary-container"}`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${selectedGroup && !expanded ? "bg-primary text-on-primary" : "bg-on-surface text-surface-bright"}`}
                      >
                        {numbers?.get(place.id) ?? "•"}
                      </span>
                      <span className="px-2 text-xs font-bold whitespace-nowrap">
                        {visits.length} событий
                      </span>
                      <Icon
                        name="next"
                        size={14}
                        className={`mr-2 transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`}
                      />
                    </button>
                    {expanded ? (
                      <ol
                        id={listId}
                        onScroll={(event) => {
                          const scrollTop = event.currentTarget.scrollTop;
                          setStackScroll((previous) =>
                            new Map(previous).set(stackKey(place), scrollTop),
                          );
                        }}
                        aria-label={`События в точке: ${place.name}`}
                        className="flex max-h-64 flex-col-reverse items-start gap-1 overflow-y-auto overscroll-contain"
                      >
                        {visits.map((visit) => {
                          const selected = visit.event.id === selectedEventId;
                          return (
                            <li key={visit.event.id} className="shrink-0">
                              <button
                                type="button"
                                data-event-id={visit.event.id}
                                onKeyDown={(event) => {
                                  if (
                                    event.key !== "Enter" &&
                                    event.key !== " "
                                  )
                                    return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onSelectEvent(visit.event.id);
                                }}
                                aria-pressed={selected}
                                aria-label={`${visit.event.title}, ${eventTime(visit.event.startAt)}`}
                                title={visit.event.title}
                                className={`flex h-8 max-w-60 items-center rounded-full border-2 border-surface-bright px-3 text-xs font-bold shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "bg-primary text-on-primary ring-4 ring-primary/20" : "bg-surface-bright text-on-surface hover:bg-primary-container"}`}
                              >
                                <span className="truncate">
                                  {eventTime(visit.event.startAt)} ·{" "}
                                  {visit.event.title}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    ) : null}
                  </div>
                );
              }
            : undefined
        }
        className={
          className
            ? "h-full w-full overflow-hidden"
            : "h-80 w-full overflow-hidden rounded-large sm:h-96"
        }
      />
      {!places.length ? (
        <p className="absolute bottom-4 left-4 rounded-small bg-surface-bright px-3 py-2 text-sm font-semibold shadow-lg">
          Для выбранного периода нет мест на карте.
        </p>
      ) : null}
    </section>
  );
}
