"use client";

import { useId, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import api, {
  type EventDto,
  type PlaceDto,
  type TransportType,
  type TripDto,
  tripQueryKeys,
} from "@shared/api";
import { Button, FormError, Icon, type IconName } from "@shared/ui";

interface CreateFromTicketFormProps {
  tripId: number;
  trip: TripDto;
  places: PlaceDto[];
  onSuccess?: () => void;
}

type Kind = "plane" | "train" | "bus";

const KINDS: Record<
  Kind,
  {
    label: string;
    title: string;
    icon: IconName;
    transport: TransportType;
    accent: string;
    tint: string;
    number: string;
    line: string;
  }
> = {
  plane: {
    label: "Самолёт",
    title: "Посадочный талон",
    icon: "plane",
    transport: "plane",
    accent: "#5f59ff",
    tint: "#f3f2ff",
    number: "Рейс",
    line: "repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 9px)",
  },
  train: {
    label: "Поезд",
    title: "Железнодорожный билет",
    icon: "train",
    transport: "train",
    accent: "#12915a",
    tint: "#eef8f2",
    number: "Поезд №",
    line: "linear-gradient(currentColor, currentColor) 0 50% / 100% 2px no-repeat, repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 8px)",
  },
  bus: {
    label: "Автобус",
    title: "Автобусный билет",
    icon: "bus",
    transport: "other",
    accent: "#e27612",
    tint: "#fff6ec",
    number: "Рейс",
    line: "repeating-linear-gradient(90deg, currentColor 0 12px, transparent 12px 18px)",
  },
};

const STEPS = ["Фото билета", "Данные", "Проверка"];

export function CreateFromTicketForm({
  tripId,
  trip,
  places,
  onSuccess,
}: CreateFromTicketFormProps) {
  const fileId = useId();
  const queryClient = useQueryClient();
  const request = useRef<{ payload: string; id: string } | null>(null);
  const uploads = useRef(new WeakMap<File, Map<number, string>>());
  const [kind, setKind] = useState<Kind>("plane");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [values, setValues] = useState({
    number: "",
    fromId: "",
    toId: "",
    date: trip.startDate,
    departure: "",
    arrival: "",
    seat: "",
    extra: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const meta = KINDS[kind];
  const set = (key: keyof typeof values) => (value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const from = places.find((place) => String(place.id) === values.fromId);
  const to = places.find((place) => String(place.id) === values.toId);
  const startAt = values.departure
    ? new Date(`${values.date}T${values.departure}`)
    : null;
  let endAt = values.arrival
    ? new Date(`${values.date}T${values.arrival}`)
    : null;
  if (startAt && endAt && endAt < startAt)
    endAt = new Date(endAt.getTime() + 86_400_000);

  const problems = [
    !from && "Выберите, откуда",
    !to && "Выберите, куда",
    from && to && from.id === to.id && "Откуда и куда совпадают",
    !startAt && "Укажите время отправления",
  ].filter(Boolean) as string[];
  const step = photo ? (problems.length ? 1 : 2) : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!from || !to || !startAt) throw new Error("invalid");
      const description = [
        kind === "bus" ? "Автобус" : null,
        values.seat ? `Место ${values.seat}` : null,
        values.extra || null,
      ]
        .filter(Boolean)
        .join(" · ");
      const data = {
        type: "movement",
        title:
          `${meta.label}${values.number ? ` ${values.number}` : ""}: ${from.name} → ${to.name}`.slice(
            0,
            200,
          ),
        description: description || null,
        startAt: startAt.toISOString(),
        endAt: endAt ? endAt.toISOString() : null,
        transportType: meta.transport,
        fromPlace: { id: from.id },
        toPlace: { id: to.id },
      };
      const payload = JSON.stringify({ tripId, data });
      if (request.current?.payload !== payload) {
        request.current = { payload, id: crypto.randomUUID() };
      }
      const event = (
        await api.post<EventDto>(`/trips/${tripId}/events`, {
          ...data,
          clientRequestId: request.current.id,
        })
      ).data;
      if (photo) {
        const form = new FormData();
        form.append("file", photo);
        let pending = uploads.current.get(photo);
        if (!pending) {
          pending = new Map();
          uploads.current.set(photo, pending);
        }
        const id = pending.get(event.id) ?? crypto.randomUUID();
        pending.set(event.id, id);
        form.append("client_request_id", id);
        await api.post(
          `/trips/${tripId}/events/${event.id}/attachments`,
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }
      return event;
    },
    onSuccess: () => {
      request.current = null;
      uploads.current = new WeakMap();
      onSuccess?.();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });

  const field = (
    label: string,
    key: keyof typeof values,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="m3-ticket-key">{label}</span>
      <input
        value={values[key]}
        onChange={(event) => set(key)(event.target.value)}
        className="m3-ticket-input"
        {...props}
      />
    </label>
  );

  const placeSelect = (key: "fromId" | "toId", align: "left" | "right") => (
    <select
      value={values[key]}
      onChange={(event) => set(key)(event.target.value)}
      aria-label={key === "fromId" ? "Откуда" : "Куда"}
      className={`m3-ticket-input max-w-full truncate text-2xl font-extrabold tracking-tight ${align === "right" ? "text-right" : ""}`}
    >
      <option value="">{key === "fromId" ? "Откуда?" : "Куда?"}</option>
      {places.map((place) => (
        <option key={place.id} value={place.id}>
          {place.name}
        </option>
      ))}
    </select>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (!problems.length) mutation.mutate();
      }}
      noValidate
    >
      <ol className="grid grid-cols-3 gap-1.5" aria-label="Этапы">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span className="h-1 overflow-hidden rounded-full bg-surface-container-high">
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{
                  width: index < step ? "100%" : index === step ? "40%" : "0%",
                }}
              />
            </span>
            <span
              className={`text-xs font-bold ${index <= step ? "text-primary" : "text-on-surface-variant"} ${index === step ? "text-on-surface" : ""}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div
        className="m3-segmented self-start"
        role="tablist"
        aria-label="Транспорт"
      >
        {(Object.keys(KINDS) as Kind[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={kind === key}
            onClick={() => setKind(key)}
            className="flex items-center gap-1.5"
          >
            <Icon name={KINDS[key].icon} size={16} />
            {KINDS[key].label}
          </button>
        ))}
      </div>

      {places.length < 2 ? (
        <FormError>
          Для перемещения нужны хотя бы два места в поездке. Добавьте их на
          карте.
        </FormError>
      ) : null}

      <div
        className="m3-ticket"
        style={{ boxShadow: `inset 0 5px 0 ${meta.accent}` }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 sm:p-6">
          <div
            className="flex items-center justify-between gap-3 text-xs font-extrabold tracking-wide uppercase"
            style={{ color: meta.accent }}
          >
            <span>{meta.title}</span>
            <label className="flex items-center gap-1.5">
              {meta.number}
              <input
                value={values.number}
                onChange={(event) => set("number")(event.target.value)}
                placeholder="—"
                className="m3-ticket-input w-24 text-right uppercase"
                style={{ color: meta.accent }}
              />
            </label>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 flex-col">
              {placeSelect("fromId", "left")}
              <span className="text-xs text-on-surface-variant">
                отправление
              </span>
            </div>
            <span
              className="flex w-16 items-center gap-1 sm:w-28"
              style={{ color: meta.accent }}
            >
              <span
                className="h-2 flex-1 opacity-50"
                style={{ background: meta.line }}
              />
              <Icon
                name={meta.icon}
                size={18}
                className={kind === "plane" ? "rotate-45" : ""}
              />
              <span
                className="h-2 flex-1 opacity-50"
                style={{ background: meta.line }}
              />
            </span>
            <div className="flex min-w-0 flex-col items-end">
              {placeSelect("toId", "right")}
              <span className="text-xs text-on-surface-variant">прибытие</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {field("Дата", "date", {
              type: "date",
              min: trip.startDate,
              max: trip.endDate,
            })}
            {field(kind === "plane" ? "Вылет" : "Отправление", "departure", {
              type: "time",
            })}
            {field(kind === "plane" ? "Прилёт" : "Прибытие", "arrival", {
              type: "time",
            })}
            {field(
              kind === "plane"
                ? "Класс, бронь"
                : kind === "train"
                  ? "Вагон, билет"
                  : "Платформа, перевозчик",
              "extra",
              { placeholder: "—" },
            )}
          </div>
        </div>
        <div className="m3-ticket-stub" style={{ background: meta.tint }}>
          {field("Место", "seat", {
            placeholder: "—",
            className: "m3-ticket-input text-2xl font-extrabold",
          })}
          <label
            htmlFor={fileId}
            className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-medium border-[1.5px] border-dashed text-center text-xs font-bold"
            style={{ borderColor: meta.accent, color: meta.accent }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Фото билета"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <>
                <Icon name="camera" size={22} />
                Фото билета
              </>
            )}
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              setPhoto(file);
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-medium bg-surface-container px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
        <Icon name="sparkle" size={18} className="mt-0.5 text-primary" />
        <span>
          {from && to && startAt ? (
            <>
              В маршрут добавится {meta.label.toLowerCase()}{" "}
              <b className="text-on-surface">
                {from.name} → {to.name}
              </b>{" "}
              {startAt.toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              .{photo ? " Фото билета прикрепится к перемещению." : ""}
            </>
          ) : (
            "Заполните поля прямо на билете — нажмите на любое из них."
          )}
        </span>
      </div>

      {submitted && problems.length ? (
        <FormError>{`${problems.join(". ")}.`}</FormError>
      ) : null}
      {mutation.isError ? (
        <FormError>
          Не удалось сохранить перемещение или фото билета. Проверьте даты
          поездки и повторите отправку с теми же данными: уже сохранённое
          перемещение не будет создано повторно.
        </FormError>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={mutation.isPending || places.length < 2}
        >
          {mutation.isPending ? "Добавляем…" : "Добавить в маршрут"}
        </Button>
      </div>
    </form>
  );
}
