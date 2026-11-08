"use client";

import {
  CATEGORY_ICON,
  type Event,
  TRANSPORT_META,
  formatDuration,
} from "@entities/event";
import { AttachmentGallery, attachmentUrl } from "@features/attachment/manage";
import { Button, Icon } from "@shared/ui";

interface EventInspectorProps {
  tripId: number;
  event: Event | null;
  coverUrl: string | null;
  placeNumbers: Map<number, number>;
  canEdit: boolean;
  onEdit: (eventId: number) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  excursion: "Экскурсия",
  museum: "Музей",
  theater: "Театр",
  walk: "Прогулка",
  accommodation: "Проживание",
  restaurant: "Ресторан",
  meeting: "Встреча",
  other: "Событие",
};

const dayTime = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

const timeOnly = (value: string) =>
  new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function EventInspector({
  tripId,
  event,
  coverUrl,
  placeNumbers,
  canEdit,
  onEdit,
  onClose,
}: EventInspectorProps) {
  if (!event) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary-container text-primary">
          <Icon name="pin" size={26} />
        </span>
        <p className="m3-title">Выберите событие</p>
      </div>
    );
  }

  const photo = event.attachments[0];
  const heroSrc = photo ? attachmentUrl(photo.id, "original") : coverUrl;
  const duration =
    event.endAt &&
    formatDuration(
      new Date(event.endAt).getTime() - new Date(event.startAt).getTime(),
    );
  const transport =
    event.type === "movement"
      ? (TRANSPORT_META[event.transportType] ?? TRANSPORT_META.other)
      : null;
  const number =
    event.type === "activity" && event.place
      ? placeNumbers.get(event.place.id)
      : event.type === "movement"
        ? placeNumbers.get(event.toPlace.id)
        : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="relative h-52 shrink-0 overflow-hidden rounded-large bg-primary-container">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-primary">
              <Icon
                name={
                  transport
                    ? transport.icon
                    : event.type === "activity"
                      ? CATEGORY_ICON[event.category]
                      : "pin"
                }
                size={48}
              />
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-small bg-surface-bright/95 text-on-surface"
          >
            <Icon name="close" size={16} />
          </button>
          {event.attachments.length > 1 ? (
            <span className="absolute right-2.5 bottom-2.5 rounded-small bg-scrim/60 px-2 py-0.5 text-xs font-bold text-on-primary">
              1 / {event.attachments.length}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-primary">
            {number ? (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-on-primary">
                {number}
              </span>
            ) : null}
            {transport
              ? `Перемещение · ${transport.label}`
              : event.type === "activity"
                ? `Место · ${CATEGORY_LABELS[event.category]}`
                : null}
          </span>
          <h2 className="text-2xl leading-tight font-extrabold tracking-tight">
            {event.title}
          </h2>
          <ul className="mt-1 flex flex-col gap-1.5 text-sm text-on-surface">
            <li className="flex items-center gap-2">
              <Icon
                name="clock"
                size={16}
                className="text-on-surface-variant"
              />
              {dayTime(event.startAt)}
              {event.endAt ? ` – ${timeOnly(event.endAt)}` : ""}
              {duration ? ` · ${duration}` : " · без окончания"}
            </li>
            {event.type === "movement" ? (
              <li className="flex items-center gap-2">
                <Icon
                  name="pin"
                  size={16}
                  className="text-on-surface-variant"
                />
                {event.fromPlace.name} → {event.toPlace.name}
              </li>
            ) : event.place &&
              (event.place.name !== event.title || event.place.address) ? (
              <li className="flex items-start gap-2">
                <Icon
                  name="pin"
                  size={16}
                  className="mt-0.5 shrink-0 text-on-surface-variant"
                />
                <span className="min-w-0">
                  {event.place.name !== event.title ? (
                    <span className="block">{event.place.name}</span>
                  ) : null}
                  {event.place.address ? (
                    <span className="block text-on-surface-variant">
                      {event.place.address}
                    </span>
                  ) : null}
                </span>
              </li>
            ) : null}
            {event.bookingUrl ? (
              <li className="flex min-w-0 items-center gap-2">
                <Icon
                  name="link"
                  size={16}
                  className="text-on-surface-variant"
                />
                <a
                  href={event.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-semibold underline"
                >
                  Бронь или билет
                </a>
              </li>
            ) : null}
          </ul>
          {event.description ? (
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {event.description}
            </p>
          ) : null}
        </div>

        <AttachmentGallery tripId={tripId} event={event} canEdit={canEdit} />
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-2 border-t border-outline-variant p-3">
          <Button
            variant="outlined"
            className="flex-1"
            onClick={() => onEdit(event.id)}
          >
            <Icon name="edit" size={16} />
            Изменить
          </Button>
        </div>
      ) : null}
    </div>
  );
}
