"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EventDetails,
  EventList,
  EventTimeline,
  useEventQuery,
  useEventsQuery,
} from "@entities/event";
import {
  PlaceDetails,
  PlaceList,
  usePlaceQuery,
  usePlacesQuery,
} from "@entities/place";
import { TripDetails, useTripQuery } from "@entities/trip";
import { CreateEventForm } from "@features/event/create";
import { DeleteEventButton } from "@features/event/delete";
import { UpdateEventForm } from "@features/event/update";
import { CreatePlaceForm } from "@features/place/create";
import { DeletePlaceButton } from "@features/place/delete";
import { UpdatePlaceForm } from "@features/place/update";
import { DeleteTripButton } from "@features/trip/delete";
import { UpdateTripForm } from "@features/trip/update";
import { formatDate } from "@shared/lib";
import { Button, Dialog, FormError, StatusMessage, TextLink } from "@shared/ui";
import { TripMap } from "@widgets/trip-map";

interface TripPageProps {
  tripId: number;
}

const TABS = [
  { id: "base", label: "Общее" },
  { id: "places", label: "Места" },
  { id: "events", label: "События" },
];

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
  const places = usePlacesQuery(tripId);
  const events = useEventsQuery(tripId);
  const selectedPlace = usePlaceQuery(tripId, selectedId);
  const selectedEvent = useEventQuery(tripId, selectedId);
  const isSelectedPopup =
    popupType === "place" ||
    popupType === "event" ||
    (popupType === "trip" && selectedId === tripId);
  const isCreatePopup =
    popupType === "create-place" || popupType === "create-event";

  const closePopup = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
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

  return (
    <main id="main-content" className="m3-page">
      <TextLink href="/trips">Все поездки</TextLink>
      {!Number.isInteger(tripId) || tripId <= 0 ? (
        <FormError>Некорректный ID поездки.</FormError>
      ) : detail.isPending ? (
        <StatusMessage loading>Загружаем поездку…</StatusMessage>
      ) : detail.isError ? (
        <FormError>
          Не удалось загрузить поездку. Попробуйте обновить страницу.
        </FormError>
      ) : detail.data ? (
        <div className="m3-trip-shell">
          <nav aria-label="Разделы поездки" className="m3-tabs">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => openTab(tab.id)}
                variant="nav"
              >
                {tab.label}
              </Button>
            ))}
          </nav>
          <header className="m3-page-heading">
            <div className="min-w-0 space-y-4">
              <p className="m3-eyebrow">ВАШЕ ПУТЕШЕСТВИЕ</p>
              <h1 className="m3-headline">{detail.data.trip.title}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="m3-badge">{detail.data.trip.country}</span>
                <span className="m3-badge">
                  {formatDate(detail.data.trip.startDate)} —{" "}
                  {formatDate(detail.data.trip.endDate)}
                </span>
              </div>
            </div>
            <Button
              variant="tonal"
              onClick={() => openPopup("trip", tripId)}
              className="w-full shrink-0 sm:w-auto"
            >
              {detail.data.role === "owner" ? "Изменить поездку" : "О поездке"}
            </Button>
          </header>

          <section
            className="min-w-0 flex-1 space-y-5"
            aria-label={TABS.find((tab) => tab.id === activeTab)?.label}
          >
            {activeTab === "base" ? (
              <div className="grid min-w-0 gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <TripDetails detail={detail.data} />
                </div>
                <aside className="m3-surface flex flex-col gap-4 bg-tertiary-container text-on-tertiary-container self-start">
                  <p className="m3-label">Места и события</p>
                  <p className="m3-title">Соберите свою историю поездки</p>
                  <p>
                    Сохраните важные места и запланируйте события в разделах
                    путешествия.
                  </p>
                </aside>
              </div>
            ) : null}
            {activeTab === "places" ? (
              <>
                <h1 className="text-2xl font-semibold">Места</h1>
                <TripMap places={detail.data.places} />
                {detail.data.role !== "viewer" ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => openPopup("create-place")}
                  >
                    Создать место
                  </Button>
                ) : null}
                {places.isPending ? (
                  <StatusMessage loading>Загружаем места…</StatusMessage>
                ) : places.isError ? (
                  <FormError>Не удалось загрузить места.</FormError>
                ) : !places.data?.length ? (
                  <StatusMessage>Мест пока нет.</StatusMessage>
                ) : (
                  <PlaceList
                    places={places.data}
                    onSelect={(id) => openPopup("place", id)}
                  />
                )}
              </>
            ) : null}
            {activeTab === "events" ? (
              <>
                <div className="m3-section-heading">
                  <h2 className="m3-title">События</h2>
                  {detail.data.role !== "viewer" ? (
                    <Button
                      type="button"
                      onClick={() => openPopup("create-event")}
                      className="w-fit"
                    >
                      Создать событие
                    </Button>
                  ) : null}
                </div>
                {events.isPending ? (
                  <StatusMessage loading>Загружаем события…</StatusMessage>
                ) : events.isError ? (
                  <FormError>Не удалось загрузить события.</FormError>
                ) : (
                  <>
                    <EventTimeline
                      events={events.data ?? []}
                      startDate={detail.data.trip.startDate}
                      endDate={detail.data.trip.endDate}
                      isPopupOpen={isSelectedPopup || isCreatePopup}
                      onSelect={
                        detail.data.role !== "viewer"
                          ? (id) => openPopup("event", id)
                          : undefined
                      }
                    />
                    {!events.data?.length ? (
                      <StatusMessage>Событий пока нет.</StatusMessage>
                    ) : (
                      <EventList
                        events={events.data}
                        onSelect={(id) => openPopup("event", id)}
                      />
                    )}
                  </>
                )}
              </>
            ) : null}
          </section>
        </div>
      ) : (
        <StatusMessage>Поездка не найдена.</StatusMessage>
      )}
      {isSelectedPopup || isCreatePopup ? (
        <Dialog labelledBy="entity-popup-heading" onClose={closePopup}>
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <h2 id="entity-popup-heading" className="m3-title">
                {popupType === "create-place"
                  ? "Новое место"
                  : popupType === "create-event"
                    ? "Новое событие"
                    : popupType === "place"
                      ? "Место"
                      : popupType === "event"
                        ? "Событие"
                        : "Поездка"}
              </h2>
              <Button type="button" onClick={closePopup} variant="text">
                Закрыть
              </Button>
            </div>
            {isCreatePopup ? (
              detail.isPending ? (
                <StatusMessage loading>Загружаем данные…</StatusMessage>
              ) : detail.isError || !detail.data ? (
                <FormError>Не удалось загрузить поездку.</FormError>
              ) : detail.data.role === "viewer" ? (
                <FormError>Недостаточно прав для создания.</FormError>
              ) : popupType === "create-place" ? (
                <CreatePlaceForm tripId={tripId} onSuccess={closePopup} />
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
            ) : detail.isPending ? (
              <StatusMessage loading>Загружаем данные…</StatusMessage>
            ) : detail.isError ? (
              <FormError>Не удалось загрузить данные.</FormError>
            ) : popupType === "place" ? (
              selectedPlace.data ? (
                <>
                  {detail.data && detail.data.role !== "viewer" ? (
                    <UpdatePlaceForm
                      key={`update-place-${selectedPlace.data.id}`}
                      tripId={tripId}
                      place={selectedPlace.data}
                      onSuccess={closePopup}
                    />
                  ) : (
                    <PlaceDetails place={selectedPlace.data} />
                  )}
                  {detail.data && detail.data.role !== "viewer" ? (
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
                  {detail.data && detail.data.role !== "viewer" ? (
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
                  {detail.data && detail.data.role !== "viewer" ? (
                    <DeleteEventButton
                      key={`delete-event-${selectedEvent.data.id}`}
                      tripId={tripId}
                      eventId={selectedEvent.data.id}
                      onSuccess={closePopup}
                    />
                  ) : null}
                </>
              ) : (
                <StatusMessage>Событие не найдено.</StatusMessage>
              )
            ) : detail.data ? (
              <>
                {detail.data.role === "owner" ? (
                  <>
                    <UpdateTripForm
                      trip={detail.data.trip}
                      events={detail.data.timeline}
                      onSuccess={closePopup}
                    />
                  </>
                ) : (
                  <TripDetails detail={detail.data} />
                )}
                {detail.data.role === "owner" ? (
                  <DeleteTripButton tripId={tripId} onSuccess={onTripDeleted} />
                ) : null}
              </>
            ) : (
              <StatusMessage>Поездка не найдена.</StatusMessage>
            )}
          </section>
        </Dialog>
      ) : null}
    </main>
  );
}
