"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LngLat } from "ymaps3";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EventDayTimeline,
  EventDetails,
  EventList,
  timelineX,
  useEventQuery,
} from "@entities/event";
import {
  PlaceDetails,
  PlaceList,
  type StopValue,
  geocodeCoordinates,
  usePlaceQuery,
} from "@entities/place";
import { TripDetails, useTripQuery } from "@entities/trip";
import { AddPlaceForm, CreateEventForm } from "@features/event/create";
import { DeleteEventButton } from "@features/event/delete";
import { CreateFromTicketForm } from "@features/event/from-ticket";
import { DeletePlaceButton } from "@features/place/delete";
import { UpdatePlaceForm } from "@features/place/update";
import { DeleteTripButton } from "@features/trip/delete";
import { UpdateTripForm } from "@features/trip/update";
import { tripCoverUrl } from "@shared/lib";
import { Button, Dialog, FormError, Icon, StatusMessage } from "@shared/ui";
import { EventInspector } from "@widgets/event-inspector";
import { TripItinerary } from "@widgets/trip-itinerary";
import { TripMap } from "@widgets/trip-map";

interface TripPageProps {
  tripId: number;
}

const TABS = [
  { id: "base", label: "План" },
  { id: "timeline", label: "Таймлайн" },
  { id: "places", label: "Места" },
];

const DAY_MS = 86_400_000;
const ZOOM_LEVELS = [1, 1.6, 2.5, 4, 6];
const HOUR_MS = 3_600_000;

const POPUP_TITLES: Record<string, string> = {
  "create-place": "Новое место",
  "create-event": "Добавить в план",
  ticket: "Добавить из билета",
  place: "Место",
  event: "Событие",
  trip: "Поездка",
};

export function TripPage({ tripId }: TripPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedTab = searchParams?.get("opened-tab");
  const activeTab =
    openedTab === "places" || openedTab === "events" || openedTab === "timeline"
      ? openedTab
      : "base";
  const popupType = searchParams?.get("open-popup-type");
  const selectedId = Number(searchParams?.get("open-popup-id"));
  const detail = useTripQuery(tripId);
  const selectedPlace = usePlaceQuery(tripId, selectedId);
  const selectedEvent = useEventQuery(tripId, selectedId);
  const dayParam = searchParams?.get("day");
  const focusParam = Number(searchParams?.get("selected-event"));
  const zoomParam = Number(searchParams?.get("zoom"));
  const focusedId =
    Number.isInteger(focusParam) && focusParam > 0 ? focusParam : null;
  const zoom =
    Number.isInteger(zoomParam) &&
    zoomParam >= 0 &&
    zoomParam < ZOOM_LEVELS.length
      ? zoomParam
      : 0;
  const [scrollWidth, setScrollWidth] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState(false);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [pointPending, setPointPending] = useState(false);
  const [pointError, setPointError] = useState("");
  const [pickedPlace, setPickedPlace] = useState<StopValue | null>(null);
  const pointRequest = useRef<AbortController | null>(null);
  const timelineDrag = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    dragged: boolean;
  } | null>(null);
  const suppressTimelineClick = useRef(false);
  const [timelineDragging, setTimelineDragging] = useState(false);

  const cancelPicking = useCallback(() => {
    pointRequest.current?.abort();
    pointRequest.current = null;
    setPicking(false);
    setPointPending(false);
    setPointError("");
  }, []);

  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelPicking();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picking, cancelPicking]);
  const canEditTrip = detail.data?.role !== "viewer";
  const isSelectedPopup =
    popupType === "place" ||
    popupType === "event" ||
    (popupType === "trip" && selectedId === tripId);
  const isCreatePopup =
    popupType === "create-place" ||
    popupType === "create-event" ||
    popupType === "ticket";

  const closePopup = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    params.delete("add-day");
    params.delete("tile");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const openPopup = (type: string, id?: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", type);
    if (id === undefined) params.delete("open-popup-id");
    else params.set("open-popup-id", String(id));
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const setParams = (values: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  const pushParams = (values: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const setFocusedId = (id: number | null) =>
    setParams({ "selected-event": id === null ? null : String(id) });

  const selectCoordinates = async (coordinates: LngLat) => {
    if (!picking) return;
    pointRequest.current?.abort();
    const request = new AbortController();
    pointRequest.current = request;
    setPointPending(true);
    setPointError("");
    try {
      const address = await geocodeCoordinates(coordinates, request.signal);
      if (request.signal.aborted || pointRequest.current !== request) return;
      setPickedPlace({
        kind: "new",
        place: {
          name: (address?.split(",")[0] ?? "Точка на карте").slice(0, 200),
          address: address ?? null,
          longitude: coordinates[0],
          latitude: coordinates[1],
        },
      });
      cancelPicking();
      pushParams({ "open-popup-type": "create-place", "open-popup-id": null });
    } catch (error) {
      if (!request.signal.aborted && pointRequest.current === request) {
        setPointError(
          error instanceof Error
            ? error.message
            : "Не удалось определить адрес. Выберите точку ещё раз.",
        );
        setPointPending(false);
      }
    }
  };

  const mapControls = canEditTrip ? (
    <>
      <div className="m3-map-tools">
        <Button
          variant={picking ? "filled" : "tonal"}
          aria-pressed={picking}
          onClick={() => {
            if (picking) cancelPicking();
            else {
              setPointError("");
              setPicking(true);
            }
          }}
        >
          <Icon name={picking ? "close" : "pin"} size={16} />
          {picking ? "Отмена" : "Поставить точку"}
        </Button>
        {picking ? (
          <p role="status" className="m3-map-hint">
            {pointPending ? "Определяем адрес…" : "Нажмите на карту"}
          </p>
        ) : null}
        {picking && pointError ? (
          <div className="m3-map-hint">
            <FormError>{pointError}</FormError>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-pressed={showOrganizations}
        aria-label={
          showOrganizations
            ? "Скрыть организации и транспорт"
            : "Показать организации и транспорт"
        }
        title={
          showOrganizations
            ? "Скрыть организации и транспорт"
            : "Показать организации и транспорт"
        }
        onClick={() => setShowOrganizations((visible) => !visible)}
        className="m3-map-layers"
      >
        <Icon name="buildings" size={18} />
      </button>
    </>
  ) : null;

  const mapProps = {
    selectedEventId: focusedId,
    onSelectEvent: (id: number) => setFocusedId(id),
    showOrganizations,
    picking: picking && canEditTrip,
    onSelectCoordinates: (coordinates: LngLat) => {
      void selectCoordinates(coordinates);
    },
    onUnavailablePoi: () => {
      pointRequest.current?.abort();
      pointRequest.current = null;
      setPointPending(false);
      setPointError("Выберите точку рядом с организацией.");
    },
  };

  const openTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("opened-tab", tabId);
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const onTripDeleted = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    router.replace(`/trips${params.size ? `?${params}` : ""}`);
  };

  const trip = detail.data?.trip;
  const timeline = useMemo(
    () =>
      [...(detail.data?.timeline ?? [])].sort(
        (left, right) =>
          Date.parse(left.startAt) - Date.parse(right.startAt) ||
          left.id - right.id,
      ),
    [detail.data?.timeline],
  );

  const days = useMemo(() => {
    if (!trip) return [];
    const first = new Date(`${trip.startDate}T00:00:00`);
    const count =
      Math.round(
        (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / DAY_MS,
      ) + 1;
    return Array.from({ length: Math.max(count, 1) }, (_, index) => {
      const start = new Date(first);
      start.setDate(first.getDate() + index);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return { start: start.getTime(), end: end.getTime() };
    });
  }, [trip]);

  const placeNumbers = useMemo(() => {
    const numbers = new Map<number, number>();
    const add = (id: number) => {
      if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
    };
    timeline.forEach((event) => {
      if (event.type === "movement") {
        add(event.fromPlace.id);
        add(event.toPlace.id);
      } else if (event.place) add(event.place.id);
    });
    detail.data?.places.forEach((place) => add(place.id));
    return numbers;
  }, [timeline, detail.data?.places]);

  const focusedEvent = timeline.find((event) => event.id === focusedId);
  const parsedDay = Number(dayParam);
  const day: number | "all" =
    dayParam === "all"
      ? "all"
      : Number.isInteger(parsedDay) && days[parsedDay]
        ? parsedDay
        : focusedEvent
          ? Math.max(
              0,
              days.findIndex(
                (item) => Date.parse(focusedEvent.startAt) < item.end,
              ),
            )
          : 0;
  const selectedDayKey =
    day === "all" || !days[day]
      ? undefined
      : new Date(days[day].start).toLocaleDateString("sv-SE");
  const setDay = (value: number | "all") =>
    setParams({ day: String(value), zoom: null });

  const range =
    day === "all" || !days[day]
      ? {
          start: days[0]?.start ?? 0,
          end: days.at(-1)?.end ?? 0,
        }
      : days[day];
  const dayEvents = timeline.filter((event) => {
    const start = Date.parse(event.startAt);
    const end = event.endAt ? Date.parse(event.endAt) : start;
    return end >= range.start && start < range.end;
  });

  const windowStart = range.start;
  const windowEnd = range.end;
  const totalHours = Math.max(1, (windowEnd - windowStart) / HOUR_MS);
  const fitWidth = Math.max(8, ((scrollWidth || 1000) - 64) / totalHours);
  const hourWidth = fitWidth * ZOOM_LEVELS[zoom];
  const anchorEvent =
    dayEvents.find((event) => event.id === focusedId) ?? dayEvents[0];

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setScrollWidth(element.clientWidth),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeTab, dayEvents.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !anchorEvent) return;
    const left =
      timelineX(Date.parse(anchorEvent.startAt), windowStart, hourWidth) - 120;
    element.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [anchorEvent, windowStart, hourWidth]);

  const focused = timeline.find((event) => event.id === focusedId) ?? null;
  const focusedPlaceId = focused
    ? focused.type === "movement"
      ? focused.toPlace.id
      : (focused.place?.id ?? null)
    : null;
  const dayPlaceIds = new Set(
    dayEvents.flatMap((event) =>
      event.type === "movement"
        ? [event.fromPlace.id, event.toPlace.id]
        : event.place
          ? [event.place.id]
          : [],
    ),
  );
  const mapPlaces =
    day === "all" || !dayPlaceIds.size
      ? (detail.data?.places ?? [])
      : (detail.data?.places ?? []).filter((place) =>
          dayPlaceIds.has(place.id),
        );
  const canEdit = detail.data?.role !== "viewer";
  const today = new Date().setHours(0, 0, 0, 0);
  const daysLeft = trip
    ? Math.ceil((Date.parse(`${trip.startDate}T00:00:00`) - today) / DAY_MS)
    : 0;

  const weekdayLabel = (value: number) =>
    new Date(value).toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
    });

  return (
    <main id="main-content" className="m3-trip-app">
      {!Number.isInteger(tripId) || tripId <= 0 ? (
        <div className="m3-page">
          <FormError>Некорректный ID поездки.</FormError>
        </div>
      ) : detail.isPending ? (
        <div
          role="status"
          aria-label="Загружаем поездку"
          className="m3-plan pt-[4.25rem]"
        >
          <div className="m3-plan-mapcol">
            <div className="m3-plan-mapframe m3-skeleton" />
          </div>
          <div className="m3-plan-panel">
            <div className="m3-plan-doc" aria-hidden="true">
              <div className="m3-skeleton h-14 w-2/3" />
              <div className="m3-skeleton h-56 rounded-xlarge" />
              <div className="grid grid-cols-3 gap-2.5">
                <div className="m3-skeleton h-16" />
                <div className="m3-skeleton h-16" />
                <div className="m3-skeleton h-16" />
              </div>
              <div className="m3-skeleton h-48 rounded-large" />
              <div className="m3-skeleton h-48 rounded-large" />
            </div>
          </div>
        </div>
      ) : detail.isError || !detail.data || !trip ? (
        <div className="m3-page">
          <FormError>
            Не удалось загрузить поездку. Попробуйте обновить страницу.
          </FormError>
        </div>
      ) : (
        <>
          <header className="m3-trip-bar">
            <Link
              href="/trips"
              aria-label="Все поездки"
              className="m3-icon-button"
            >
              <Icon name="back" />
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tripCoverUrl(trip.coverUrl, trip)}
              alt=""
              className="hidden size-10 shrink-0 rounded-[var(--radius-xs)] object-cover shadow-1 sm:block"
            />
            <div className="min-w-0">
              <p className="truncate text-lg leading-tight font-extrabold tracking-tight">
                {trip.title}
              </p>
              <p className="truncate text-[0.8125rem] font-semibold text-on-surface-variant">
                {trip.country} ·{" "}
                {new Date(`${trip.startDate}T12:00:00`).toLocaleDateString(
                  "ru-RU",
                  { day: "numeric", month: "long" },
                )}
                {" – "}
                {new Date(`${trip.endDate}T12:00:00`).toLocaleDateString(
                  "ru-RU",
                  { day: "numeric", month: "long" },
                )}
                {daysLeft > 0 ? ` · через ${daysLeft} дн.` : ""}
              </p>
            </div>
            <nav aria-label="Разделы поездки" className="m3-segmented">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => openTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={
                  detail.data.role === "owner"
                    ? "Изменить поездку"
                    : "О поездке"
                }
                onClick={() => openPopup("trip", tripId)}
                className="m3-icon-button bg-surface-bright shadow-1 hover:bg-surface-container-low"
              >
                <Icon name="edit" size={18} />
              </button>
              {canEdit ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => openPopup("ticket")}
                    className="hidden md:inline-flex"
                  >
                    <Icon name="camera" size={18} />
                    Из билета
                  </Button>
                  <Button onClick={() => openPopup("create-event")}>
                    <Icon name="plus" size={18} />
                    <span className="hidden sm:inline">Добавить</span>
                  </Button>
                </>
              ) : null}
            </div>
          </header>

          {activeTab === "base" ? (
            <div className="m3-plan" data-map={mapOpen ? "open" : "closed"}>
              <div className="m3-plan-mapcol">
                <div className="m3-plan-mapframe">
                  <TripMap
                    places={detail.data.places}
                    events={timeline}
                    numbers={placeNumbers}
                    selectedPlaceId={focusedPlaceId}
                    {...mapProps}
                    className="h-full"
                  />
                  {mapControls}
                  {focused ? (
                    <div
                      key={focused.id}
                      className="m3-plan-float"
                      aria-label="Выбранное событие"
                    >
                      <EventInspector
                        tripId={tripId}
                        event={focused}
                        coverUrl={tripCoverUrl(trip.coverUrl, trip)}
                        placeNumbers={placeNumbers}
                        canEdit={canEdit}
                        onEdit={(id) => openPopup("event", id)}
                        onClose={() => setFocusedId(null)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                aria-pressed={mapOpen}
                onClick={() => setMapOpen((open) => !open)}
                className="m3-map-toggle"
              >
                <Icon name={mapOpen ? "list" : "map"} size={18} />
                {mapOpen ? "Скрыть карту" : "Карта"}
              </button>
              <div className="m3-plan-panel">
                <TripItinerary
                  trip={trip}
                  events={timeline}
                  numbers={placeNumbers}
                  coverUrl={tripCoverUrl(trip.coverUrl, trip)}
                  selectedId={focusedId}
                  canEdit={canEdit}
                  onSelect={(id) => setFocusedId(id === focusedId ? null : id)}
                  onAdd={(key) =>
                    pushParams({
                      "open-popup-type": "create-place",
                      "open-popup-id": null,
                      "add-day": key,
                    })
                  }
                  onBooking={(tile) =>
                    tile === "ticket"
                      ? openPopup("ticket")
                      : pushParams({
                          "open-popup-type": "create-event",
                          "open-popup-id": null,
                          tile,
                        })
                  }
                  onEditTrip={() => openPopup("trip", tripId)}
                />
              </div>
            </div>
          ) : activeTab === "timeline" ? (
            <div className="m3-trip-body">
              <div className="m3-trip-main">
                <div className="m3-trip-map">
                  <TripMap
                    places={mapPlaces}
                    events={dayEvents}
                    numbers={placeNumbers}
                    selectedPlaceId={focusedPlaceId}
                    {...mapProps}
                    className="h-full"
                  />
                  {mapControls}
                  <span className="m3-map-chip">
                    <span className="size-2 rounded-full bg-primary" />
                    {day === "all"
                      ? `Вся поездка · ${detail.data.places.length} мест`
                      : `${weekdayLabel(range.start)} · ${dayPlaceIds.size} мест · ${dayEvents.filter((event) => event.type === "movement").length} перемещ.`}
                  </span>
                </div>

                <section
                  className="m3-timeline-panel"
                  aria-label="Таймлайн дня"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
                    <div
                      role="tablist"
                      aria-label="Дни"
                      className="m3-segmented"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={day === "all"}
                        onClick={() => setDay("all")}
                      >
                        Все дни
                      </button>
                      {days.map((item, index) => (
                        <button
                          key={item.start}
                          type="button"
                          role="tab"
                          aria-selected={day === index}
                          onClick={() => setDay(index)}
                        >
                          {weekdayLabel(item.start)}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Уменьшить масштаб"
                        disabled={zoom === 0}
                        onClick={() => setParams({ zoom: String(zoom - 1) })}
                        className="m3-icon-button size-8 disabled:opacity-40"
                      >
                        <Icon name="minus" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ zoom: null })}
                        className="min-w-24 rounded-small px-2 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container"
                      >
                        {zoom === 0
                          ? day === "all"
                            ? "Вся поездка"
                            : "Весь день"
                          : `× ${ZOOM_LEVELS[zoom]}`}
                      </button>
                      <button
                        type="button"
                        aria-label="Увеличить масштаб"
                        disabled={zoom === ZOOM_LEVELS.length - 1}
                        onClick={() => setParams({ zoom: String(zoom + 1) })}
                        className="m3-icon-button size-8 disabled:opacity-40"
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                    <ul
                      aria-label="Обозначения"
                      className="flex w-full flex-wrap gap-4 text-xs font-bold text-on-surface-variant xl:w-auto"
                    >
                      <li className="flex items-center gap-2">
                        <span className="h-3 w-7 rounded-[5px] bg-primary-container ring-[1.5px] ring-primary/30 ring-inset" />
                        Длится
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-3 rounded-full border-[3px] border-primary" />
                        Момент
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-6 rounded-full bg-outline" />
                        Дорога
                      </li>
                    </ul>
                  </div>
                  <p className="px-4 pt-2 text-sm font-extrabold">
                    {day === "all"
                      ? "Вся поездка"
                      : new Date(range.start).toLocaleDateString("ru-RU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                    <span className="ml-2 font-semibold text-on-surface-variant">
                      {dayEvents.length
                        ? `${dayEvents.length} ${dayEvents.length === 1 ? "событие" : dayEvents.length < 5 ? "события" : "событий"}`
                        : ""}
                    </span>
                  </p>
                  {dayEvents.length ? (
                    <div
                      ref={scrollRef}
                      className={`m3-timeline-scroll select-none ${timelineDragging ? "cursor-grabbing" : "cursor-grab"}`}
                      onPointerDown={(event) => {
                        suppressTimelineClick.current = false;
                        if (
                          event.pointerType === "touch" ||
                          event.button !== 0 ||
                          !event.isPrimary
                        )
                          return;
                        timelineDrag.current = {
                          pointerId: event.pointerId,
                          startX: event.clientX,
                          scrollLeft: event.currentTarget.scrollLeft,
                          dragged: false,
                        };
                      }}
                      onPointerMove={(event) => {
                        const drag = timelineDrag.current;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        const deltaX = event.clientX - drag.startX;
                        if (!drag.dragged && Math.abs(deltaX) < 5) return;
                        if (!drag.dragged) {
                          drag.dragged = true;
                          setTimelineDragging(true);
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                        }
                        event.preventDefault();
                        event.currentTarget.scrollLeft =
                          drag.scrollLeft - deltaX;
                      }}
                      onPointerUp={(event) => {
                        const drag = timelineDrag.current;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        suppressTimelineClick.current = drag.dragged;
                        timelineDrag.current = null;
                        setTimelineDragging(false);
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        )
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                      }}
                      onPointerCancel={() => {
                        timelineDrag.current = null;
                        suppressTimelineClick.current = false;
                        setTimelineDragging(false);
                      }}
                      onClickCapture={(event) => {
                        if (suppressTimelineClick.current && event.detail > 0) {
                          event.preventDefault();
                          event.stopPropagation();
                          suppressTimelineClick.current = false;
                        }
                      }}
                      onDragStart={(event) => event.preventDefault()}
                    >
                      <EventDayTimeline
                        events={dayEvents}
                        windowStart={windowStart}
                        windowEnd={windowEnd}
                        hourWidth={hourWidth}
                        selectedId={focusedId}
                        placeNumbers={placeNumbers}
                        onSelect={setFocusedId}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center gap-3 p-6 text-on-surface-variant">
                      В этот день пока ничего нет.
                      {canEdit ? (
                        <Button
                          variant="tonal"
                          onClick={() => openPopup("create-event")}
                        >
                          <Icon name="plus" size={16} />
                          Добавить событие
                        </Button>
                      ) : null}
                    </div>
                  )}
                </section>
              </div>

              <aside
                className="m3-trip-inspector"
                aria-label="Выбранное событие"
              >
                <EventInspector
                  tripId={tripId}
                  event={focused}
                  coverUrl={tripCoverUrl(trip.coverUrl, trip)}
                  placeNumbers={placeNumbers}
                  canEdit={canEdit}
                  onEdit={(id) => openPopup("event", id)}
                  onClose={() => setFocusedId(null)}
                />
              </aside>
            </div>
          ) : (
            <div className="m3-page">
              {activeTab === "places" ? (
                <>
                  <div className="m3-section-heading">
                    <h2 className="m3-title">Места</h2>
                    {canEdit ? (
                      <Button onClick={() => openPopup("create-place")}>
                        <Icon name="plus" size={18} />
                        Новое место
                      </Button>
                    ) : null}
                  </div>
                  {!detail.data.places.length ? (
                    <StatusMessage>Мест пока нет.</StatusMessage>
                  ) : (
                    <PlaceList
                      places={detail.data.places}
                      numbers={placeNumbers}
                      onSelect={(id) => openPopup("place", id)}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="m3-section-heading">
                    <h2 className="m3-title">События</h2>
                    {canEdit ? (
                      <Button onClick={() => openPopup("create-event")}>
                        <Icon name="plus" size={18} />
                        Новое событие
                      </Button>
                    ) : null}
                  </div>
                  {!timeline.length ? (
                    <StatusMessage>Событий пока нет.</StatusMessage>
                  ) : (
                    <EventList
                      events={timeline}
                      onSelect={(id) => openPopup("event", id)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {isSelectedPopup || isCreatePopup ? (
        <Dialog
          labelledBy="entity-popup-heading"
          onClose={closePopup}
          size={
            popupType === "create-place" ||
            popupType === "create-event" ||
            popupType === "place" ||
            popupType === "event" ||
            popupType === "trip"
              ? "medium"
              : "default"
          }
        >
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <div className="min-w-0">
                <h2 id="entity-popup-heading" className="m3-title">
                  {POPUP_TITLES[popupType ?? ""] ?? "Поездка"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePopup}
                aria-label="Закрыть"
                className="m3-icon-button"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            {isCreatePopup ? (
              !detail.data ? (
                <StatusMessage loading>Загружаем данные…</StatusMessage>
              ) : detail.data.role === "viewer" ? (
                <FormError>Недостаточно прав для создания.</FormError>
              ) : popupType === "create-place" ? (
                <AddPlaceForm
                  tripId={tripId}
                  trip={detail.data.trip}
                  events={detail.data.timeline}
                  places={detail.data.places}
                  defaultDay={searchParams?.get("add-day") ?? selectedDayKey}
                  initialPlace={pickedPlace ?? undefined}
                  onSuccess={() => {
                    setPickedPlace(null);
                    closePopup();
                  }}
                />
              ) : popupType === "ticket" ? (
                <CreateFromTicketForm
                  tripId={tripId}
                  trip={detail.data.trip}
                  places={detail.data.places}
                  onSuccess={closePopup}
                />
              ) : (
                <CreateEventForm
                  tripId={tripId}
                  trip={detail.data.trip}
                  events={detail.data.timeline}
                  places={detail.data.places}
                  defaultDay={selectedDayKey}
                  initialTile={searchParams?.get("tile") ?? undefined}
                  onOpenTicket={() => openPopup("ticket")}
                  onSuccess={closePopup}
                />
              )
            ) : !Number.isInteger(selectedId) || selectedId <= 0 ? (
              <FormError>Некорректный ID.</FormError>
            ) : !detail.data ? (
              <StatusMessage loading>Загружаем данные…</StatusMessage>
            ) : popupType === "place" ? (
              selectedPlace.data ? (
                <>
                  {canEdit ? (
                    <UpdatePlaceForm
                      key={`update-place-${selectedPlace.data.id}`}
                      tripId={tripId}
                      place={selectedPlace.data}
                      onSuccess={closePopup}
                    />
                  ) : (
                    <PlaceDetails place={selectedPlace.data} />
                  )}
                  {canEdit ? (
                    <DeletePlaceButton
                      key={`delete-place-${selectedPlace.data.id}`}
                      tripId={tripId}
                      placeId={selectedPlace.data.id}
                      onSuccess={closePopup}
                    />
                  ) : null}
                </>
              ) : (
                <StatusMessage>Место не найдено.</StatusMessage>
              )
            ) : popupType === "event" ? (
              selectedEvent.data ? (
                <>
                  {canEdit ? (
                    <CreateEventForm
                      key={`edit-event-${selectedEvent.data.id}`}
                      tripId={tripId}
                      trip={detail.data.trip}
                      events={detail.data.timeline}
                      places={detail.data.places}
                      editing={selectedEvent.data}
                      onSuccess={closePopup}
                    />
                  ) : (
                    <EventDetails event={selectedEvent.data} />
                  )}
                  {canEdit ? (
                    <DeleteEventButton
                      key={`delete-event-${selectedEvent.data.id}`}
                      tripId={tripId}
                      eventId={selectedEvent.data.id}
                      onSuccess={() => {
                        setFocusedId(null);
                        closePopup();
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <StatusMessage>Событие не найдено.</StatusMessage>
              )
            ) : (
              <>
                {detail.data.role === "owner" ? (
                  <UpdateTripForm
                    trip={detail.data.trip}
                    events={detail.data.timeline}
                    onSuccess={closePopup}
                  />
                ) : (
                  <TripDetails detail={detail.data} />
                )}
                {detail.data.role === "owner" ? (
                  <DeleteTripButton tripId={tripId} onSuccess={onTripDeleted} />
                ) : null}
              </>
            )}
          </section>
        </Dialog>
      ) : null}
    </main>
  );
}
