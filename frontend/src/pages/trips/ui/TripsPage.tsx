"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Dialog,
  FormError,
  Icon,
  RangeCalendar,
  StatusMessage,
  TextLink,
} from "@shared/ui";

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatShort(value: string) {
  const [, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

export function TripsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const popupType = searchParams?.get("open-popup-type");
  const selectedId = Number(searchParams?.get("open-popup-id"));
  const selectedTripId = popupType === "trip" ? selectedId : NaN;
  const trips = useTripsQuery();
  const selected = useTripQuery(selectedTripId);
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node))
        setCalendarOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  const closePopup = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const openCreate = () => {
    setCalendarOpen(false);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", "create-trip");
    params.delete("open-popup-id");
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.data?.filter((trip) => trip.endDate >= today) ?? [];
  const past = trips.data?.filter((trip) => trip.endDate < today) ?? [];
  const nights =
    range.start && range.end
      ? Math.round(
          (Date.parse(range.end) - Date.parse(range.start)) / 86_400_000,
        ) + 1
      : 0;

  return (
    <main id="main-content">
      <section className="m3-hero-band" aria-labelledby="search-heading">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-10">
          <h1 id="search-heading" className="m3-headline">
            Куда отправимся дальше?
          </h1>
          <form
            ref={searchRef}
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              openCreate();
            }}
          >
            <div className="m3-search-bar">
              <label className="m3-search-field">
                <span className="m3-search-label">Куда</span>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Город или регион"
                  className="m3-search-input"
                />
              </label>
              <button
                type="button"
                aria-expanded={calendarOpen}
                onClick={() => setCalendarOpen((open) => !open)}
                className={`m3-search-field ${calendarOpen ? "m3-search-field--active" : ""}`}
              >
                <span className="m3-search-label">Когда</span>
                <span
                  className={`m3-search-value ${range.start ? "text-on-surface" : ""}`}
                >
                  {range.start
                    ? `${formatShort(range.start)}${range.end ? ` – ${formatShort(range.end)}` : ""}`
                    : "Добавьте даты"}
                </span>
              </button>
              <label className="m3-search-field">
                <span className="m3-search-label">Страна</span>
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Россия"
                  className="m3-search-input"
                />
              </label>
              <button type="submit" className="m3-search-submit">
                Создать поездку
              </button>
            </div>
            {calendarOpen ? (
              <div
                role="dialog"
                aria-label="Выбор дат"
                className="m3-popover absolute top-full left-0 z-20 mt-3 w-full max-w-3xl md:left-[20%]"
              >
                <RangeCalendar
                  start={range.start}
                  end={range.end}
                  onChange={(start, end) => setRange({ start, end })}
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setRange({ start: "", end: "" })}
                    className="text-sm font-bold underline"
                  >
                    Сбросить
                  </button>
                  <span className="text-sm font-bold text-primary">
                    {nights ? `${nights} дн.` : "Выберите начало и конец"}
                  </span>
                  <button
                    type="button"
                    disabled={!range.end}
                    onClick={() => setCalendarOpen(false)}
                    className="m3-button min-h-10 py-1"
                  >
                    Готово
                  </button>
                </div>
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <div className="m3-page">
        {trips.isPending ? (
          <StatusMessage loading>Загружаем поездки…</StatusMessage>
        ) : trips.isError ? (
          <FormError>
            Не удалось загрузить поездки. Попробуйте обновить страницу.
          </FormError>
        ) : trips.data.length === 0 ? (
          <section className="m3-empty">
            <Icon name="plane" size={28} className="text-primary" />
            <h2 className="m3-title">Поездок пока нет</h2>
            <p className="m3-support">
              Укажите, куда и когда едете, — остальное добавите потом.
            </p>
          </section>
        ) : (
          <>
            {upcoming.length ? (
              <section className="flex flex-col gap-5">
                <h2 className="m3-title">Предстоящие поездки</h2>
                <TripList
                  trips={upcoming}
                  featured
                  onSelect={(id) => router.push(`/trips/${id}`)}
                />
              </section>
            ) : null}
            {past.length ? (
              <section className="flex flex-col gap-5">
                <h2 className="m3-title">Воспоминания</h2>
                <TripList
                  trips={past}
                  onSelect={(id) => router.push(`/trips/${id}`)}
                />
              </section>
            ) : null}
          </>
        )}
      </div>

      {popupType === "trip" || popupType === "create-trip" ? (
        <Dialog labelledBy="trip-popup-heading" onClose={closePopup}>
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <h2 id="trip-popup-heading" className="m3-title">
                {popupType === "create-trip" ? "Новая поездка" : "Поездка"}
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
            {popupType === "create-trip" ? (
              <CreateTripForm
                defaultValues={{
                  title: destination ? `Поездка: ${destination}` : "",
                  country,
                  startDate: range.start,
                  endDate: range.end,
                }}
                onSuccess={closePopup}
              />
            ) : !Number.isInteger(selectedTripId) || selectedTripId <= 0 ? (
              <FormError>Некорректный ID поездки.</FormError>
            ) : selected.isPending ? (
              <StatusMessage loading>Загружаем поездку…</StatusMessage>
            ) : selected.isError ? (
              <FormError>Не удалось загрузить поездку.</FormError>
            ) : selected.data ? (
              <>
                {selected.data.role === "owner" ? (
                  <UpdateTripForm
                    key={`update-trip-${selected.data.trip.id}`}
                    trip={selected.data.trip}
                    events={selected.data.timeline}
                    onSuccess={closePopup}
                  />
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
