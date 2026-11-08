"use client";

import { useEffect, useId, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  PlaceCombobox,
  type StopValue,
  hubToPlace,
  sameStop,
  stopName,
  stopToDto,
} from "@entities/place";
import api, {
  type EventDto,
  type PlaceDto,
  type TransportType,
  type TripDto,
  tripQueryKeys,
} from "@shared/api";
import { TRANSIT_HUBS } from "@shared/config";
import { Button, FormError, Icon, type IconName } from "@shared/ui";

import {
  AIRPORTS,
  type RecognizedTicket,
  type TicketKind,
  recognizeTicket,
} from "../model/recognize";
import { recognizeTicketWithAi } from "../api/recognize-ticket";

interface CreateFromTicketFormProps {
  tripId: number;
  trip: TripDto;
  places: PlaceDto[];
  onSuccess?: () => void;
}

const KINDS: Record<
  TicketKind,
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
    accent: "var(--tone-lavender-fg)",
    tint: "var(--tone-lavender-bg)",
    number: "Рейс",
    line: "repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 9px)",
  },
  train: {
    label: "Поезд",
    title: "Железнодорожный билет",
    icon: "train",
    transport: "train",
    accent: "var(--tone-mint-fg)",
    tint: "var(--tone-mint-bg)",
    number: "Поезд №",
    line: "linear-gradient(currentColor, currentColor) 0 50% / 100% 2px no-repeat, repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 8px)",
  },
  bus: {
    label: "Автобус",
    title: "Автобусный билет",
    icon: "bus",
    transport: "other",
    accent: "var(--tone-amber-fg)",
    tint: "var(--tone-amber-bg)",
    number: "Рейс",
    line: "repeating-linear-gradient(90deg, currentColor 0 12px, transparent 12px 18px)",
  },
};

const STEPS = ["Загрузка", "Распознавание", "Проверка"];

type Values = {
  number: string;
  date: string;
  departure: string;
  arrival: string;
  seat: string;
  extra: string;
};

function matchStop(places: PlaceDto[], code?: string): StopValue | null {
  if (!code) return null;
  const needles = [
    code.toLowerCase(),
    ...(AIRPORTS[code] ?? []),
    ...code
      .toLowerCase()
      .split(/[\s,()«»"-]+/)
      .filter((word) => word.length > 3),
  ];
  const place = places.find((item) => {
    const haystack = `${item.name} ${item.address ?? ""}`.toLowerCase();
    return needles.some((needle) => haystack.includes(needle));
  });
  if (place) return { kind: "existing", id: place.id };
  const hub = TRANSIT_HUBS.find((item) => item.code === code);
  return hub ? { kind: "new", place: hubToPlace(hub) } : null;
}

export function CreateFromTicketForm({
  tripId,
  trip,
  places,
  onSuccess,
}: CreateFromTicketFormProps) {
  const fileId = useId();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [kind, setKind] = useState<TicketKind>("plane");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<RecognizedTicket | null>(null);
  const [recognized, setRecognized] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState<StopValue | null>(null);
  const [to, setTo] = useState<StopValue | null>(null);
  const [values, setValues] = useState<Values>({
    number: "",
    date: trip.startDate,
    departure: "",
    arrival: "",
    seat: "",
    extra: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const meta = KINDS[kind];

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const set = (key: keyof Values) => (value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setRecognized((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
  };

  const process = async (file: File) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setStep(1);
    const year = Number(trip.startDate.slice(0, 4));
    const [scanned] = await Promise.all([
      recognizeTicket(file, year),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
    const found: RecognizedTicket & { arrival?: string } =
      scanned.status === "found"
        ? scanned
        : await recognizeTicketWithAi(tripId, file).catch(() => scanned);
    setResult(found);
    if (found.status === "found") {
      const next: Partial<Values> = {
        number: found.number,
        date: found.date,
        departure: found.departure,
        arrival: found.arrival,
        seat: found.seat,
        extra: found.extra,
      };
      const filled = (Object.keys(next) as (keyof Values)[]).filter(
        (key) => next[key],
      );
      setValues((previous) => ({
        ...previous,
        ...Object.fromEntries(filled.map((key) => [key, next[key]])),
      }));
      const fromStop = matchStop(places, found.from);
      const toStop = matchStop(places, found.to);
      setFrom(fromStop);
      setTo(toStop);
      setRecognized(
        new Set([
          ...filled,
          ...(fromStop ? ["from"] : []),
          ...(toStop ? ["to"] : []),
        ]),
      );
      if (found.kind) setKind(found.kind);
    }
    setStep(2);
  };

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
    sameStop(from, to) && "Откуда и куда совпадают",
    !startAt && "Укажите время отправления",
  ].filter(Boolean) as string[];

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
      const event = (
        await api.post<EventDto>(`/trips/${tripId}/events`, {
          type: "movement",
          title:
            `${meta.label}${values.number ? ` ${values.number}` : ""}: ${stopName(from, places)} → ${stopName(to, places)}`.slice(
              0,
              200,
            ),
          description: description || null,
          startAt: startAt.toISOString(),
          endAt: endAt ? endAt.toISOString() : null,
          transportType: meta.transport,
          fromPlace: stopToDto(from),
          toPlace: stopToDto(to),
        })
      ).data;
      if (photo) {
        const form = new FormData();
        form.append("file", photo);
        form.append("client_request_id", crypto.randomUUID());
        await api
          .post(`/trips/${tripId}/events/${event.id}/attachments`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .catch(() => undefined);
      }
      return event;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
      onSuccess?.();
    },
  });

  const mark = (key: string) => (recognized.has(key) ? "m3-recognized" : "");

  const field = (
    label: string,
    key: keyof Values,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="m3-ticket-key">{label}</span>
      <input
        value={values[key]}
        onChange={(event) => set(key)(event.target.value)}
        {...props}
        className={`m3-ticket-input ${mark(key)} ${props.className ?? ""}`}
      />
    </label>
  );

  const placeSelect = (key: "from" | "to") => (
    <div
      className={`flex w-full min-w-0 flex-wrap rounded-medium ${mark(key)}`}
    >
      <PlaceCombobox
        alignEnd={key === "to"}
        places={places}
        value={key === "from" ? from : to}
        onChange={(value) => {
          if (key === "from") setFrom(value);
          else setTo(value);
          setRecognized((previous) => {
            const next = new Set(previous);
            next.delete(key);
            return next;
          });
        }}
        placeholder={
          key === "from" ? (result?.from ?? "Откуда?") : (result?.to ?? "Куда?")
        }
        hubKind={
          kind === "plane" ? "airport" : kind === "train" ? "station" : null
        }
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="m3-steps">
        <span className="m3-steps-track" aria-hidden="true">
          <span style={{ width: `${[16, 50, 100][step]}%` }} />
        </span>
        <ol aria-label="Этапы">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              data-done={index < step || undefined}
            >
              {index < step ? <Icon name="check" size={13} /> : null}
              {label}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 ? (
        <div className="flex flex-col gap-3">
          <label
            htmlFor={fileId}
            data-over={dragOver}
            className="m3-dropzone"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file?.type.startsWith("image/")) void process(file);
            }}
          >
            <span className="grid size-14 place-items-center rounded-full bg-primary text-on-primary">
              <Icon name="camera" size={26} />
            </span>
            <span className="text-lg font-extrabold">Фото билета</span>
            <span
              className="flex gap-3 text-on-surface-variant"
              aria-hidden="true"
            >
              <Icon name="plane" size={18} />
              <Icon name="train" size={18} />
              <Icon name="bus" size={18} />
            </span>
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void process(file);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setStep(2);
            }}
            className="m3-scan-again justify-center"
          >
            <Icon name="edit" size={16} />
            Заполнить вручную
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative h-72 w-full max-w-md overflow-hidden rounded-large bg-scrim">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Фото билета"
                className="size-full object-contain opacity-80"
              />
            ) : null}
            <span className="m3-scan-line" aria-hidden="true" />
          </div>
          <p role="status" className="flex items-center gap-2 font-bold">
            <Icon name="sparkle" size={18} className="text-primary" />
            Читаем билет…
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (!problems.length) mutation.mutate();
          }}
          noValidate
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="m3-segmented" role="tablist" aria-label="Транспорт">
              {(Object.keys(KINDS) as TicketKind[]).map((key) => (
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
            <button
              type="button"
              onClick={() => setStep(0)}
              className="m3-scan-again"
              data-found={result?.status === "found" || undefined}
              title={
                result?.status === "found"
                  ? "Данные взяты из фото. Сканировать другое"
                  : "Заполнить по фото билета"
              }
            >
              <Icon
                name={result?.status === "found" ? "check" : "camera"}
                size={16}
              />
              {result?.status === "found" ? "Из фото" : "По фото"}
            </button>
          </div>

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
                    className={`m3-ticket-input w-24 text-right uppercase ${mark("number")}`}
                    style={{ color: meta.accent }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <div className="flex min-w-0 flex-col">
                  {placeSelect("from")}
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
                  {placeSelect("to")}
                  <span className="text-xs text-on-surface-variant">
                    прибытие
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {field("Дата", "date", {
                  type: "date",
                  min: trip.startDate,
                  max: trip.endDate,
                })}
                {field(
                  kind === "plane" ? "Вылет" : "Отправление",
                  "departure",
                  {
                    type: "time",
                  },
                )}
                {field(kind === "plane" ? "Прилёт" : "Прибытие", "arrival", {
                  type: "time",
                })}
                {field(
                  kind === "plane"
                    ? "Класс, бронь"
                    : kind === "train"
                      ? "Вагон, стоимость"
                      : "Платформа, перевозчик",
                  "extra",
                  { placeholder: "—" },
                )}
              </div>
            </div>
            <div className="m3-ticket-stub" style={{ background: meta.tint }}>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="m3-ticket-key flex items-center gap-1.5">
                  <span className="flex" style={{ color: meta.accent }}>
                    <Icon name="seat" size={14} />
                  </span>
                  Место
                </span>
                <input
                  value={values.seat}
                  onChange={(event) => set("seat")(event.target.value)}
                  placeholder="—"
                  className={`m3-ticket-input text-3xl font-extrabold uppercase ${mark("seat")}`}
                />
              </label>
              <span
                className="m3-ticket-barcode"
                aria-hidden="true"
                style={{ color: meta.accent }}
              />
            </div>
          </div>

          {submitted && problems.length ? (
            <FormError>{`${problems.join(". ")}.`}</FormError>
          ) : null}
          {mutation.isError ? (
            <FormError>
              Не удалось добавить перемещение. Проверьте, что время не
              пересекается с другими событиями и попадает в даты поездки.
            </FormError>
          ) : null}

          <div className="flex">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full"
            >
              <Icon name="plus" size={18} />
              {mutation.isPending ? "Добавляем…" : "Добавить"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
