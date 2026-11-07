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
import { Dialog, FormError, TextLink } from "@shared/ui";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Поездки</h1>
      <button
        type="button"
        onClick={openCreate}
        className="w-fit cursor-pointer rounded-lg bg-accent px-5 py-3 font-semibold hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Создать поездку
      </button>
      {trips.isPending ? (
        <p role="status">Загружаем поездки…</p>
      ) : trips.isError ? (
        <FormError>
          Не удалось загрузить поездки. Попробуйте обновить страницу.
        </FormError>
      ) : trips.data.length === 0 ? (
        <p className="text-foreground/70">Поездок пока нет.</p>
      ) : (
        <TripList trips={trips.data} onSelect={openTrip} />
      )}
      {popupType === "trip" || popupType === "create-trip" ? (
        <Dialog labelledBy="trip-popup-heading" onClose={closePopup}>
          <section className="flex w-full min-w-0 flex-col gap-6 p-5 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-muted/40 pb-4">
              <h2 id="trip-popup-heading" className="text-xl font-semibold">
                {popupType === "create-trip" ? "Новая поездка" : "Поездка"}
              </h2>
              <button
                type="button"
                onClick={closePopup}
                className="cursor-pointer rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                Закрыть
              </button>
            </div>
            {popupType === "create-trip" ? (
              <CreateTripForm onSuccess={closePopup} />
            ) : !Number.isInteger(selectedTripId) || selectedTripId <= 0 ? (
              <FormError>Некорректный ID поездки.</FormError>
            ) : selected.isPending ? (
              <p role="status">Загружаем поездку…</p>
            ) : selected.isError ? (
              <FormError>Не удалось загрузить поездку.</FormError>
            ) : selected.data ? (
              <>
                {selected.data.role === "owner" ? (
                  <>
                    <p className="text-sm text-foreground/70">
                      Роль: {selected.data.role}
                    </p>
                    <UpdateTripForm
                      key={`update-trip-${selected.data.trip.id}`}
                      trip={selected.data.trip}
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
              <p>Поездка не найдена.</p>
            )}
          </section>
        </Dialog>
      ) : null}
    </main>
  );
}
