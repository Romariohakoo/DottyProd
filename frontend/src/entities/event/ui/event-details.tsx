import { DateTimeText } from "@shared/ui";

import type { Event } from "../model";

const CATEGORY_LABELS = {
  excursion: "Экскурсия",
  museum: "Музей",
  theater: "Театр",
  walk: "Прогулка",
  accommodation: "Проживание",
  restaurant: "Ресторан",
  meeting: "Встреча",
  other: "Другое",
};

const TRANSPORT_LABELS = {
  walk: "Пешком",
  car: "Автомобиль",
  train: "Поезд",
  plane: "Самолёт",
  other: "Другое",
};

interface EventDetailsProps {
  event: Event;
}

export function EventDetails({ event }: EventDetailsProps) {
  return (
    <section className="m3-form" aria-label="Детали события">
      <div className="m3-surface bg-tertiary-container text-on-tertiary-container">
        <p className="m3-label">
          {event.type === "activity" ? "Активность" : "Перемещение"}
        </p>
        <h3 className="m3-title mt-3">{event.title}</h3>
      </div>
      <dl className="m3-details">
        <div className="m3-detail-row">
          <dt className="m3-label">Тип</dt>
          <dd>{event.type === "activity" ? "Активность" : "Перемещение"}</dd>
        </div>
        <div className="m3-detail-row">
          <dt className="m3-label">Название</dt>
          <dd>{event.title}</dd>
        </div>
        <div className="m3-detail-row">
          <dt className="m3-label">Описание</dt>
          <dd>{event.description ?? "Не указано"}</dd>
        </div>
        <div className="m3-detail-row">
          <dt className="m3-label">Начало</dt>
          <dd>
            <DateTimeText value={event.startAt} />
          </dd>
        </div>
        <div className="m3-detail-row">
          <dt className="m3-label">Окончание</dt>
          <dd>
            {event.endAt ? <DateTimeText value={event.endAt} /> : "Не указано"}
          </dd>
        </div>
        <div className="m3-detail-row">
          <dt className="m3-label">Ссылка на бронь</dt>
          <dd>{event.bookingUrl ?? "Не указана"}</dd>
        </div>
        {event.type === "activity" ? (
          <>
            <div className="m3-detail-row">
              <dt className="m3-label">Категория</dt>
              <dd>{CATEGORY_LABELS[event.category]}</dd>
            </div>
            <div className="m3-detail-row">
              <dt className="m3-label">Место</dt>
              <dd>
                {event.place
                  ? [
                      event.place.name,
                      event.place.address ?? "адрес не указан",
                      event.place.description,
                      `${event.place.latitude}, ${event.place.longitude}`,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "Не указано"}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div className="m3-detail-row">
              <dt className="m3-label">Транспорт</dt>
              <dd>{TRANSPORT_LABELS[event.transportType]}</dd>
            </div>
            <div className="m3-detail-row">
              <dt className="m3-label">Откуда</dt>
              <dd>
                {[
                  event.fromPlace.name,
                  event.fromPlace.address ?? "адрес не указан",
                  event.fromPlace.description,
                  `${event.fromPlace.latitude}, ${event.fromPlace.longitude}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
            <div className="m3-detail-row">
              <dt className="m3-label">Куда</dt>
              <dd>
                {[
                  event.toPlace.name,
                  event.toPlace.address ?? "адрес не указан",
                  event.toPlace.description,
                  `${event.toPlace.latitude}, ${event.toPlace.longitude}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
}
