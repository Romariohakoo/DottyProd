"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  type TripCard,
  TripDetails,
  useTripQuery,
  useTripsQuery,
} from "@entities/trip";
import { useGetMe } from "@entities/user";
import { CreateTripForm } from "@features/trip/create";
import { DeleteTripButton } from "@features/trip/delete";
import { UpdateTripForm } from "@features/trip/update";
import { tripCoverUrl } from "@shared/lib";
import {
  Button,
  Dialog,
  FormError,
  Icon,
  StatusMessage,
  TextLink,
} from "@shared/ui";

const DAY_MS = 86_400_000;

const MONTHS = [
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

const day = (value: string) => Date.parse(`${value}T00:00:00`);

const short = (value: string) => {
  const [, month, date] = value.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]}`;
};

const plural = (count: number, one: string, few: string, many: string) =>
  count % 10 === 1 && count % 100 !== 11
    ? one
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? few
      : many;

const length = (trip: TripCard) =>
  Math.round((day(trip.endDate) - day(trip.startDate)) / DAY_MS) + 1;

const greeting = (hour: number) =>
  hour < 5
    ? "Доброй ночи"
    : hour < 12
      ? "Доброе утро"
      : hour < 18
        ? "Добрый день"
        : "Добрый вечер";

function status(trip: TripCard, today: number) {
  if (day(trip.endDate) < today)
    return { label: "Прошла", tone: "slate" as const };
  if (day(trip.startDate) <= today)
    return { label: "Сейчас", tone: "mint" as const };
  const left = Math.round((day(trip.startDate) - today) / DAY_MS);
  return {
    label:
      left === 1
        ? "Завтра"
        : `Через ${left} ${plural(left, "день", "дня", "дней")}`,
    tone: "lavender" as const,
  };
}

function DayStrip({ trip, today }: { trip: TripCard; today: number }) {
  const total = length(trip);
  const shown = Math.min(total, 7);
  const first = day(trip.startDate);
  return (
    <div className="m3-daystrip" aria-label="Дни поездки">
      {Array.from({ length: shown }, (_, index) => {
        const date = new Date(first + index * DAY_MS);
        const value = date.getTime();
        const state =
          value < today ? "past" : value === today ? "today" : "next";
        return (
          <span key={value} data-state={state}>
            <small>
              {value === today
                ? "сегодня"
                : date.toLocaleDateString("ru-RU", { weekday: "short" })}
            </small>
            <b>{date.getDate()}</b>
          </span>
        );
      })}
      {total > shown ? (
        <span data-state="more">
          <small>ещё</small>
          <b>+{total - shown}</b>
        </span>
      ) : null}
    </div>
  );
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
  const me = useGetMe();

  const closePopup = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("open-popup-type");
    params.delete("open-popup-id");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const openCreate = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("open-popup-type", "create-trip");
    params.delete("open-popup-id");
    router.push(`${pathname}?${params}`, { scroll: false });
  };

  const now = new Date();
  const today = new Date(now).setHours(0, 0, 0, 0);
  const sorted = [...(trips.data ?? [])].sort(
    (left, right) => day(left.startDate) - day(right.startDate),
  );
  const upcoming = sorted.filter((trip) => day(trip.endDate) >= today);
  const past = sorted.filter((trip) => day(trip.endDate) < today).reverse();
  const focus = upcoming[0];
  const name = me.data?.name || me.data?.username;

  const headline = !focus ? (
    <>
      Куда отправимся <span className="m3-accent">дальше?</span>
    </>
  ) : day(focus.startDate) <= today ? (
    <>
      Вы в пути,{" "}
      <span className="m3-accent-num">
        день {Math.round((today - day(focus.startDate)) / DAY_MS) + 1} из{" "}
        {length(focus)}
      </span>
    </>
  ) : (
    (() => {
      const left = Math.round((day(focus.startDate) - today) / DAY_MS);
      return (
        <>
          До поездки{" "}
          <span className="m3-accent-num">
            {left === 1
              ? "1 день"
              : `${left} ${plural(left, "день", "дня", "дней")}`}
          </span>
        </>
      );
    })()
  );

  const row = (trip: TripCard) => {
    const badge = status(trip, today);
    const total = length(trip);
    return (
      <li key={trip.id}>
        <button
          type="button"
          onClick={() => router.push(`/trips/${trip.id}`)}
          className="m3-trip-row"
          data-past={badge.tone === "slate" || undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tripCoverUrl(trip.coverUrl, trip)} alt="" />
          <span className="min-w-0 flex-1">
            <b>{trip.title}</b>
            <small>
              <Icon name="calendar" size={13} />
              {short(trip.startDate)} – {short(trip.endDate)}
              <span aria-hidden="true">·</span>
              {total} {plural(total, "день", "дня", "дней")}
              <span aria-hidden="true">·</span>
              {trip.country}
            </small>
          </span>
          <span className="m3-chip" data-tone={badge.tone}>
            {badge.label}
          </span>
          <Icon name="next" size={18} className="m3-trip-row-arrow" />
        </button>
      </li>
    );
  };

  return (
    <main id="main-content" className="m3-dash">
      <header className="m3-dash-head">
        <div className="min-w-0">
          <p className="m3-greeting">
            {name ? `${greeting(now.getHours())}, ${name}` : " "}
          </p>
          <h1 className="m3-dash-title">{headline}</h1>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Icon name="plus" size={18} />
          Новая поездка
        </Button>
      </header>

      {trips.isPending ? (
        <div
          role="status"
          aria-label="Загружаем поездки"
          className="flex flex-col gap-3"
        >
          <div className="m3-skeleton h-48 rounded-xlarge" />
          <div className="m3-skeleton h-20 rounded-large" />
          <div className="m3-skeleton h-20 rounded-large" />
        </div>
      ) : trips.isError ? (
        <FormError>Не удалось загрузить поездки. Обновите страницу.</FormError>
      ) : !sorted.length ? (
        <button type="button" onClick={openCreate} className="m3-dash-empty">
          <span className="m3-tone-tile size-14" data-tone="lavender">
            <Icon name="plane" size={26} />
          </span>
          <b>Первая поездка</b>
          <span className="m3-chip" data-tone="lavender">
            <Icon name="plus" size={14} />
            Создать
          </span>
        </button>
      ) : (
        <>
          {focus ? (
            <button
              type="button"
              onClick={() => router.push(`/trips/${focus.id}`)}
              className="m3-next-trip"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tripCoverUrl(focus.coverUrl, focus)} alt="" />
              <span className="m3-next-trip-body">
                <span className="m3-next-trip-top">
                  <span className="min-w-0">
                    <b>{focus.title}</b>
                    <small>
                      <Icon name="globe" size={13} />
                      {focus.country}
                      <span aria-hidden="true">·</span>
                      {short(focus.startDate)} – {short(focus.endDate)}
                    </small>
                  </span>
                  <span
                    className="m3-chip"
                    data-tone={status(focus, today).tone}
                  >
                    {status(focus, today).label}
                  </span>
                </span>
                <DayStrip trip={focus} today={today} />
              </span>
            </button>
          ) : null}

          {upcoming.length > 1 ? (
            <section
              className="m3-dash-section"
              aria-labelledby="upcoming-heading"
            >
              <h2 id="upcoming-heading">
                Дальше <span>{upcoming.length - 1}</span>
              </h2>
              <ul className="m3-trip-rows">{upcoming.slice(1).map(row)}</ul>
            </section>
          ) : null}

          {past.length ? (
            <section className="m3-dash-section" aria-labelledby="past-heading">
              <h2 id="past-heading">
                Прошедшие <span>{past.length}</span>
              </h2>
              <ul className="m3-trip-rows">{past.map(row)}</ul>
            </section>
          ) : null}
        </>
      )}

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
