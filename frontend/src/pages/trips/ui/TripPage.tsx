"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EventDetails,
  EventList,
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
import { Dialog, FormError, TextLink } from "@shared/ui";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <TextLink href="/trips">Все поездки</TextLink>
      {!Number.isInteger(tripId) || tripId <= 0 ? (
        <FormError>Некорректный ID поездки.</FormError>
      ) : detail.isPending ? (
        <p role="status">Загружаем поездку…</p>
      ) : detail.isError ? (
        <FormError>
          Не удалось загрузить поездку. Попробуйте обновить страницу.
        </FormError>
      ) : detail.data ? (
        <div className="flex flex-col gap-6 sm:flex-row">
          <nav
            aria-label="Разделы поездки"
            className="flex shrink-0 flex-col gap-2"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => openTab(tab.id)}
                className="cursor-pointer rounded-lg border border-muted/60 px-4 py-3 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent aria-[current=page]:bg-accent/20"
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <section
            className="min-w-0 flex-1 space-y-5"
            aria-label={TABS.find((tab) => tab.id === activeTab)?.label}
          >
            {activeTab === "base" ? (
              <h1 className="text-2xl font-semibold">
                {detail.data.trip.title}
              </h1>
            ) : null}
            {activeTab === "places" ? (
              <>
                <h1 className="text-2xl font-semibold">Места</h1>
                {detail.data.role !== "viewer" ? (
                  <button
                    type="button"
                    onClick={() => openPopup("create-place")}
                    className="cursor-pointer rounded-lg bg-accent px-5 py-3 font-semibold hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Создать место
                  </button>
                ) : null}
                {places.isPending ? (
                  <p role="status">Загружаем места…</p>
                ) : places.isError ? (
                  <FormError>Не удалось загрузить места.</FormError>
                ) : !places.data?.length ? (
                  <p className="text-foreground/70">Мест пока нет.</p>
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
                <h1 className="text-2xl font-semibold">События</h1>
                {detail.data.role !== "viewer" ? (
                  <button
                    type="button"
                    onClick={() => openPopup("create-event")}
                    className="cursor-pointer rounded-lg bg-accent px-5 py-3 font-semibold hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Создать событие
                  </button>
                ) : null}
                {events.isPending ? (
                  <p role="status">Загружаем события…</p>
                ) : events.isError ? (
                  <FormError>Не удалось загрузить события.</FormError>
                ) : !events.data?.length ? (
                  <p className="text-foreground/70">Событий пока нет.</p>
                ) : (
                  <EventList
                    events={events.data}
                    onSelect={(id) => openPopup("event", id)}
                  />
                )}
              </>
            ) : null}
          </section>
        </div>
      ) : (
        <p>Поездка не найдена.</p>
      )}
      {isSelectedPopup || isCreatePopup ? (
        <Dialog labelledBy="entity-popup-heading" onClose={closePopup}>
          <section className="flex w-full min-w-0 flex-col gap-6 p-5 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-muted/40 pb-4">
              <h2 id="entity-popup-heading" className="text-xl font-semibold">
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
              <button
                type="button"
                onClick={closePopup}
                className="cursor-pointer rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                Закрыть
              </button>
            </div>
            {isCreatePopup ? (
              detail.isPending ? (
                <p role="status">Загружаем данные…</p>
              ) : detail.isError || !detail.data ? (
                <FormError>Не удалось загрузить поездку.</FormError>
              ) : detail.data.role === "viewer" ? (
                <FormError>Недостаточно прав для создания.</FormError>
              ) : popupType === "create-place" ? (
                <CreatePlaceForm tripId={tripId} onSuccess={closePopup} />
              ) : (
                <CreateEventForm
                  tripId={tripId}
                  places={detail.data.places}
                  onSuccess={closePopup}
                />
              )
            ) : !Number.isInteger(selectedId) || selectedId <= 0 ? (
              <FormError>Некорректный ID.</FormError>
            ) : detail.isPending ? (
              <p role="status">Загружаем данные…</p>
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
                <p>Место не найдено.</p>
              )
            ) : popupType === "event" ? (
              selectedEvent.data ? (
                <>
                  {detail.data && detail.data.role !== "viewer" ? (
                    <UpdateEventForm
                      key={`update-event-${selectedEvent.data.id}`}
                      tripId={tripId}
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
                <p>Событие не найдено.</p>
              )
            ) : detail.data ? (
              <>
                {detail.data.role === "owner" ? (
                  <>
                    <p className="text-sm text-foreground/70">
                      Роль: {detail.data.role}
                    </p>
                    <UpdateTripForm
                      trip={detail.data.trip}
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
              <p>Поездка не найдена.</p>
            )}
          </section>
        </Dialog>
      ) : null}
    </main>
  );
}
