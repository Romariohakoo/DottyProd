import type { Event } from "../model";

interface EventDetailsProps {
  event: Event;
}

export function EventDetails({ event }: EventDetailsProps) {
  return (
    <dl className="grid gap-2 break-words text-sm">
      <dt className="text-foreground/70">ID</dt>
      <dd>{event.id}</dd>
      <dt className="text-foreground/70">Тип</dt>
      <dd>{event.type}</dd>
      <dt className="text-foreground/70">Название</dt>
      <dd>{event.title}</dd>
      <dt className="text-foreground/70">Описание</dt>
      <dd>{event.description ?? "Не указано"}</dd>
      <dt className="text-foreground/70">Начало</dt>
      <dd>{event.startAt}</dd>
      <dt className="text-foreground/70">Окончание</dt>
      <dd>{event.endAt ?? "Не указано"}</dd>
      <dt className="text-foreground/70">Ссылка на бронь</dt>
      <dd>{event.bookingUrl ?? "Не указана"}</dd>
      <dt className="text-foreground/70">Автор</dt>
      <dd>{event.createdBy}</dd>
      {event.type === "activity" ? (
        <>
          <dt className="text-foreground/70">Категория</dt>
          <dd>{event.category}</dd>
          <dt className="text-foreground/70">Место</dt>
          <dd>
            {event.place
              ? `${event.place.name} (#${event.place.id}), ${event.place.address ?? "адрес не указан"}, ${event.place.latitude}, ${event.place.longitude}`
              : "Не указано"}
          </dd>
        </>
      ) : (
        <>
          <dt className="text-foreground/70">Транспорт</dt>
          <dd>{event.transportType}</dd>
          <dt className="text-foreground/70">Откуда</dt>
          <dd>
            {event.fromPlace.name} (#{event.fromPlace.id}),{" "}
            {event.fromPlace.address ?? "адрес не указан"},{" "}
            {event.fromPlace.latitude}, {event.fromPlace.longitude}
          </dd>
          <dt className="text-foreground/70">Куда</dt>
          <dd>
            {event.toPlace.name} (#{event.toPlace.id}),{" "}
            {event.toPlace.address ?? "адрес не указан"},{" "}
            {event.toPlace.latitude}, {event.toPlace.longitude}
          </dd>
        </>
      )}
    </dl>
  );
}
