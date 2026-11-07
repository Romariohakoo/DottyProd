"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  TripDetails,
  TripList,
  useTripQuery,
  useTripsQuery,
} from "@entities/trip";
import { CreateTripForm } from "@features/trip/create";
import { DeleteTripButton } from "@features/trip/delete";
import { UpdateTripForm } from "@features/trip/update";
import { Button, Dialog, FormError, StatusMessage, TextLink } from "@shared/ui";

export function TripsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const popupType = searchParams?.get("open-popup-type");
  const selectedId = Number(searchParams?.get("open-popup-id"));
  const selectedTripId = popupType === "trip" ? selectedId : NaN;
  const trips = useTripsQuery();
  const selected = useTripQuery(selectedTripId);

  const closePopup = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const openTrip = (tripId: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", "trip");
    params.set("open-popup-id", String(tripId));
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const openCreate = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", "create-trip");
    params.delete("open-popup-id");
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  return (
    <main id="main-content" className="m3-page">
      <header className="m3-page-heading">
        <div className="min-w-0 space-y-4">
          <p className="m3-eyebrow">ВАША КОЛЛЕКЦИЯ ПУТЕШЕСТВИЙ</p>
          <h1 className="m3-headline">Поездки</h1>
          <p className="max-w-lg">
            Большие планы и маленькие открытия. Всё начинается здесь.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="w-full shrink-0 sm:w-auto"
        >
          <span aria-hidden="true">＋</span> Создать поездку
        </Button>
      </header>
      {trips.isPending ? (
        <StatusMessage loading>Загружаем поездки…</StatusMessage>
      ) : trips.isError ? (
        <FormError>
          Не удалось загрузить поездки. Попробуйте обновить страницу.
        </FormError>
      ) : trips.data.length === 0 ? (
        <StatusMessage>Поездок пока нет.</StatusMessage>
      ) : (
        <TripList trips={trips.data} onSelect={openTrip} />
      )}
      {popupType === "trip" || popupType === "create-trip" ? (
        <Dialog labelledBy="trip-popup-heading" onClose={closePopup}>
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <h2 id="trip-popup-heading" className="m3-title">
                {popupType === "create-trip" ? "Новая поездка" : "Поездка"}
              </h2>
              <Button type="button" onClick={closePopup} variant="text">
                Закрыть
              </Button>
            </div>
            {popupType === "create-trip" ? (
              <CreateTripForm onSuccess={closePopup} />
            ) : !Number.isInteger(selectedTripId) || selectedTripId <= 0 ? (
              <FormError>Некорректный ID поездки.</FormError>
            ) : selected.isPending ? (
              <StatusMessage loading>Загружаем поездку…</StatusMessage>
            ) : selected.isError ? (
              <FormError>Не удалось загрузить поездку.</FormError>
            ) : selected.data ? (
              <>
                {selected.data.role === "owner" ? (
                  <>
                    <UpdateTripForm
                      key={`update-trip-${selected.data.trip.id}`}
                      trip={selected.data.trip}
                      events={selected.data.timeline}
                      onSuccess={closePopup}
                    />
                  </>
                ) : (
                  <TripDetails detail={selected.data} />
                )}
                {selected.data.role === "owner" ? (
                  <DeleteTripButton
                    key={`delete-trip-${selected.data.trip.id}`}
                    tripId={selected.data.trip.id}
                    onSuccess={closePopup}
                  />
                ) : null}
                <TextLink href={`/trips/${selected.data.trip.id}`}>
                  Открыть поездку
                </TextLink>
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
