"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EventDayTimeline,
  EventDetails,
  EventList,
  useEventQuery,
} from "@entities/event";
import type { LngLat } from "ymaps3";

import {
  geocodeCoordinates,
  PlaceDetails,
  PlaceList,
  usePlaceQuery,
} from "@entities/place";
import { TripDetails, useTripQuery } from "@entities/trip";
import { CreateEventForm } from "@features/event/create";
import { DeleteEventButton } from "@features/event/delete";
import { CreateFromTicketForm } from "@features/event/from-ticket";
import { UpdateEventForm } from "@features/event/update";
import {
  CreatePlaceForm,
  type CreatePlaceValues,
} from "@features/place/create";
import { DeletePlaceButton } from "@features/place/delete";
import { UpdatePlaceForm } from "@features/place/update";
import { DeleteTripButton } from "@features/trip/delete";
import { UpdateTripForm } from "@features/trip/update";
import { Button, Dialog, FormError, Icon, StatusMessage } from "@shared/ui";
import { EventInspector } from "@widgets/event-inspector";
import { TripMap } from "@widgets/trip-map";

interface TripPageProps {
  tripId: number;
}

const TABS = [
  { id: "base", label: "Маршрут" },
  { id: "places", label: "Места" },
  { id: "events", label: "События" },
];

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const POPUP_TITLES: Record<string, string> = {
  "create-place": "Новое место",
  "create-event": "Новое событие",
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
    openedTab === "places" || openedTab === "events" ? openedTab : "base";
  const popupType = searchParams?.get("open-popup-type");
  const selectedId = Number(searchParams?.get("open-popup-id"));
  const detail = useTripQuery(tripId);
  const selectedPlace = usePlaceQuery(tripId, selectedId);
  const selectedEvent = useEventQuery(tripId, selectedId);
  const [requestedDay, setDay] = useState<number | "all">("all");
  const activeIdParam = searchParams?.get("active-event-id");
  const parsedActiveId =
    activeIdParam && /^\d+$/.test(activeIdParam) ? Number(activeIdParam) : NaN;
  const focusedId =
    Number.isSafeInteger(parsedActiveId) && parsedActiveId > 0
      ? parsedActiveId
      : null;
  const [picking, setPicking] = useState(false);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [pointPending, setPointPending] = useState(false);
  const [pointError, setPointError] = useState("");
  const [placeDraft, setPlaceDraft] =
    useState<Partial<CreatePlaceValues> | null>(null);
  const [pointNotice, setPointNotice] = useState("");
  const pointRequest = useRef<AbortController | null>(null);
  const timelineDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
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
    return cancelPicking;
  }, [tripId, searchParams, detail.data?.role, cancelPicking]);

  useEffect(() => {
    if (popupType !== "create-place") return;
    return () => {
      setPlaceDraft(null);
      setPointNotice("");
    };
  }, [popupType, tripId]);

  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelPicking();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picking, cancelPicking]);
  const isSelectedPopup =
    popupType === "place" ||
    popupType === "event" ||
    (popupType === "trip" && selectedId === tripId);
  const isCreatePopup =
    popupType === "create-place" ||
    popupType === "create-event" ||
    popupType === "ticket";

  const closePopup = useCallback(() => {
    setPlaceDraft(null);
    setPointNotice("");
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const openPopup = (type: string, id?: number) => {
    cancelPicking();
    setPlaceDraft(null);
    setPointNotice("");
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", type);
    if (id === undefined) params.delete("open-popup-id");
    else params.set("open-popup-id", String(id));
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const selectEvent = (id: number | null) => {
    cancelPicking();
    const params = new URLSearchParams(searchParams?.toString());
    if (id === null) params.delete("active-event-id");
    else params.set("active-event-id", String(id));
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  const selectCoordinates = async (coordinates: LngLat) => {
    if (!picking || detail.data?.role === "viewer" || !detail.data) return;
    pointRequest.current?.abort();
    const request = new AbortController();
    pointRequest.current = request;
    setPointPending(true);
    setPointError("");
    try {
      const address = await geocodeCoordinates(coordinates, request.signal);
      if (request.signal.aborted || pointRequest.current !== request) return;
      setPlaceDraft({
        name: "",
        address: address ?? "",
        longitude: coordinates[0],
        latitude: coordinates[1],
      });
      setPointNotice(
        address
          ? ""
          : "Адрес не найден. Координаты сохранены; укажите название и при необходимости адрес вручную.",
      );
      setPicking(false);
      const params = new URLSearchParams(searchParams?.toString());
      params.set("open-popup-type", "create-place");
      params.delete("open-popup-id");
      router.push(`${pathname}?${params}`, { scroll: false });
    } catch (error) {
      if (!request.signal.aborted && pointRequest.current === request) {
        setPointError(
          error instanceof Error
            ? error.message
            : "Не удалось определить адрес. Повторите выбор точки.",
        );
      }
    } finally {
      if (!request.signal.aborted && pointRequest.current === request)
        setPointPending(false);
    }
  };

  const openTab = (tabId: string) => {
    cancelPicking();
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

  const focused = timeline.find((event) => event.id === focusedId) ?? null;

  useEffect(() => {
    if (activeIdParam == null || !detail.isSuccess || detail.isFetching) return;
    if (focusedId !== null && timeline.some((event) => event.id === focusedId))
      return;
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("active-event-id");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [
    activeIdParam,
    detail.isSuccess,
    detail.isFetching,
    focusedId,
    timeline,
    pathname,
    router,
    searchParams,
  ]);

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

  const requestedRange = requestedDay === "all" ? null : days[requestedDay];
  const focusedOutsideDay =
    focused &&
    requestedRange &&
    (Date.parse(focused.startAt) >= requestedRange.end ||
      Date.parse(focused.endAt ?? focused.startAt) < requestedRange.start);
  const day = requestedDay;
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

  let windowStart = range.start;
  let windowEnd = range.end;
  let hourWidth = Math.max(10, 1100 / ((range.end - range.start) / HOUR_MS));
  if (day !== "all" && dayEvents.length) {
    const starts = dayEvents.map((event) => Date.parse(event.startAt));
    const ends = dayEvents.map((event) =>
      event.endAt ? Date.parse(event.endAt) : Date.parse(event.startAt),
    );
    windowStart = Math.max(
      range.start,
      Math.floor((Math.min(...starts) - HOUR_MS) / HOUR_MS) * HOUR_MS,
    );
    windowEnd = Math.min(
      range.end,
      Math.ceil((Math.max(...ends) + 2 * HOUR_MS) / HOUR_MS) * HOUR_MS,
    );
    if (windowEnd - windowStart < 8 * HOUR_MS)
      windowEnd = Math.min(range.end, windowStart + 8 * HOUR_MS);
    hourWidth = 90;
  }

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
    day === "all"
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
        <div className="m3-page">
          <StatusMessage loading>Загружаем поездку…</StatusMessage>
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
            {trip.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trip.coverUrl}
                alt=""
                className="hidden size-10 shrink-0 rounded-small object-cover sm:block"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold">{trip.title}</h1>
              <p className="truncate text-sm text-on-surface-variant">
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
                className="m3-icon-button"
              >
                <Icon name="edit" size={18} />
              </button>
              {canEdit ? (
                <>
                  <Button
                    variant="tonal"
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
            <div className="m3-trip-body">
              <div className="m3-trip-main">
                <div className="m3-trip-map">
                  <TripMap
                    places={mapPlaces}
                    events={dayEvents}
                    numbers={placeNumbers}
                    selectedPlaceId={focusedPlaceId}
                    selectedEventId={focused?.id ?? null}
                    onSelectEvent={selectEvent}
                    showOrganizations={showOrganizations}
                    picking={picking && canEdit}
                    onSelectCoordinates={(coordinates) => {
                      void selectCoordinates(coordinates);
                    }}
                    onUnavailablePoi={() => {
                      pointRequest.current?.abort();
                      pointRequest.current = null;
                      setPointPending(false);
                      setPointError(
                        "Добавление организации по её метке пока недоступно. Выберите точку рядом или добавьте место вручную.",
                      );
                    }}
                    className="h-full"
                  />
                  <div className="absolute top-4 left-4 z-20 flex max-w-full flex-col items-start gap-2 pr-8">
                    {canEdit ? (
                      <Button
                        variant={picking ? "filled" : "tonal"}
                        aria-pressed={picking}
                        onClick={() => {
                          if (picking) cancelPicking();
                          else {
                            setPointError("");
                            setPointPending(false);
                            setPicking(true);
                          }
                        }}
                      >
                        <Icon name={picking ? "close" : "pin"} size={16} />
                        {picking ? "Отменить добавление" : "Поставить точку"}
                      </Button>
                    ) : null}
                    {picking ? (
                      <div
                        className="max-w-72 rounded-small bg-surface-bright p-3 text-sm shadow-lg"
                        role="status"
                      >
                        {pointPending
                          ? "Определяем адрес… Можно выбрать другую точку."
                          : "Выберите точку на карте. Escape — отмена. Место также можно добавить вручную на вкладке «Места»."}
                      </div>
                    ) : null}
                    {pointError && picking ? (
                      <div className="max-w-72 rounded-small bg-surface-bright p-3 shadow-lg">
                        <FormError>{pointError}</FormError>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
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
                    aria-pressed={showOrganizations}
                    onClick={() => setShowOrganizations((visible) => !visible)}
                    className={`m3-icon-button absolute top-4 right-4 z-20 !w-12 border-2 !bg-surface-bright shadow-lg hover:!bg-surface-bright ${showOrganizations ? "border-primary text-primary" : "border-transparent text-on-surface"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 items-center justify-center gap-1.5"
                    >
                      <Icon name="buildings" size={20} />
                      <Icon name="faBus" size={18} />
                    </span>
                  </button>
                  <span className="absolute right-4 bottom-4 rounded-small bg-surface-bright px-3 py-2 text-sm font-semibold shadow-lg">
                    {day === "all"
                      ? `Вся поездка · ${detail.data.places.length} мест`
                      : `${weekdayLabel(range.start)} · ${dayPlaceIds.size} мест`}
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
                    <ul
                      aria-label="Обозначения"
                      className="ml-auto flex flex-wrap gap-4 text-xs font-bold text-on-surface-variant"
                    >
                      <li className="flex items-center gap-2">
                        <span className="h-3 w-7 rounded-[5px] bg-primary-container ring-[1.5px] ring-[#c9c7f5] ring-inset" />
                        Длится
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="m3-dot size-3 rounded-full border-[3px] border-primary" />
                        Момент
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-6 rounded-full bg-outline" />
                        Дорога
                      </li>
                    </ul>
                  </div>
                  {focusedOutsideDay ? (
                    <p role="status" className="m3-support px-4 pt-2">
                      Выбранное событие относится к другому дню и остаётся в
                      инспекторе.{" "}
                      <Button variant="text" onClick={() => setDay("all")}>
                        Показать все дни
                      </Button>
                    </p>
                  ) : null}
                  {dayEvents.length ? (
                    <div
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
                          startY: event.clientY,
                          scrollLeft: event.currentTarget.scrollLeft,
                          scrollTop: event.currentTarget.scrollTop,
                          dragged: false,
                        };
                      }}
                      onPointerMove={(event) => {
                        const drag = timelineDrag.current;
                        if (!drag || drag.pointerId !== event.pointerId) return;
                        const deltaX = event.clientX - drag.startX;
                        const deltaY = event.clientY - drag.startY;
                        if (!drag.dragged && Math.hypot(deltaX, deltaY) < 5)
                          return;
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
                        event.currentTarget.scrollTop = drag.scrollTop - deltaY;
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
                      onPointerLeave={() => {
                        if (!timelineDrag.current?.dragged)
                          timelineDrag.current = null;
                      }}
                      onLostPointerCapture={() => {
                        if (timelineDrag.current?.dragged)
                          suppressTimelineClick.current = true;
                        timelineDrag.current = null;
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
                        selectedId={focused?.id ?? null}
                        placeNumbers={placeNumbers}
                        onSelect={selectEvent}
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
                  coverUrl={trip.coverUrl}
                  placeNumbers={placeNumbers}
                  canEdit={canEdit}
                  onEdit={(id) => openPopup("event", id)}
                  onClose={() => selectEvent(null)}
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
        <Dialog labelledBy="entity-popup-heading" onClose={closePopup}>
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <h2 id="entity-popup-heading" className="m3-title">
                {POPUP_TITLES[popupType ?? ""] ?? "Поездка"}
              </h2>
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
                <>
                  {pointNotice ? (
                    <StatusMessage>{pointNotice}</StatusMessage>
                  ) : null}
                  <CreatePlaceForm
                    key={`create-place-${tripId}-${placeDraft?.longitude ?? "manual"}-${placeDraft?.latitude ?? ""}`}
                    tripId={tripId}
                    initialValues={placeDraft ?? undefined}
                    onSuccess={closePopup}
                  />
                </>
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
                    <UpdateEventForm
                      key={`update-event-${selectedEvent.data.id}`}
                      tripId={tripId}
                      trip={detail.data.trip}
                      events={detail.data.timeline}
                      event={selectedEvent.data}
                      places={detail.data.places}
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
                        const params = new URLSearchParams(
                          searchParams?.toString(),
                        );
                        params.delete("open-popup-type");
                        params.delete("open-popup-id");
                        if (focusedId === selectedId)
                          params.delete("active-event-id");
                        router.replace(
                          `${pathname}${params.size ? `?${params}` : ""}`,
                          { scroll: false },
                        );
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
