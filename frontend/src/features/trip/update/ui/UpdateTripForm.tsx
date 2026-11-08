"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { Event } from "@entities/event";
import type { Trip } from "@entities/trip";
import { uploadMedia } from "@shared/api";
import { TRIP_COVERS } from "@shared/config";
import { getEventScheduleError, tripCoverUrl } from "@shared/lib";
import { Button, FormError, Icon, RangeCalendar } from "@shared/ui";

import { useUpdateTripMutation } from "../model/use-update-trip-mutation";
import { type UpdateTripValues, updateTripSchema } from "../model/validation";

interface UpdateTripFormProps {
  trip: Trip;
  events: Event[];
  onSuccess?: () => void;
}

const shortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

export function UpdateTripForm({
  trip,
  events,
  onSuccess,
}: UpdateTripFormProps) {
  const { mutate, isPending, error } = useUpdateTripMutation(trip.id);
  const [panel, setPanel] = useState<"cover" | "dates" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateTripValues>({
    defaultValues: {
      title: trip.title,
      country: trip.country,
      startDate: trip.startDate,
      endDate: trip.endDate,
      description: trip.description ?? "",
      coverUrl: trip.coverUrl ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(updateTripSchema),
  });

  const [startDate, endDate, coverUrl] = useWatch({
    control,
    name: ["startDate", "endDate", "coverUrl"],
  });
  const outsideEvent =
    startDate && endDate && startDate <= endDate
      ? events.find((event) =>
          getEventScheduleError(
            event.startAt,
            event.endAt ?? "",
            { startDate, endDate },
            [],
          ),
        )
      : undefined;
  const cover = tripCoverUrl(coverUrl || null, trip);
  const days =
    startDate && endDate
      ? Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) +
        1
      : 0;

  const onSubmit = (values: UpdateTripValues) => {
    if (!isDirty || isPending || outsideEvent) return;
    mutate(
      {
        ...values,
        title: values.title.trim(),
        country: values.country.trim(),
        description: values.description || null,
        coverUrl: values.coverUrl.trim() || null,
      },
      { onSuccess },
    );
  };

  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadFailed(false);
    try {
      const url = await uploadMedia(file);
      setValue("coverUrl", url, { shouldDirty: true });
      setPanel(null);
    } catch {
      setUploadFailed(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="relative h-64 overflow-hidden rounded-xlarge bg-gradient-to-br from-primary to-[#8a6cff]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-scrim/80 via-scrim/10 to-transparent" />
        <button
          type="button"
          aria-expanded={panel === "cover"}
          onClick={() => setPanel(panel === "cover" ? null : "cover")}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-surface-bright/95 px-3 py-1.5 text-sm font-bold shadow-lg hover:bg-surface-bright"
        >
          <Icon name="image" size={15} />
          Сменить обложку
        </button>
        <div className="absolute right-5 bottom-4 left-5 flex flex-col gap-2 text-on-primary">
          <label className="m3-editable-title">
            <textarea
              {...register("title")}
              rows={2}
              maxLength={200}
              aria-label="Название поездки"
              placeholder="Название поездки"
              className="m3-autosize w-full resize-none bg-transparent text-3xl leading-tight font-extrabold tracking-tight outline-none placeholder:text-on-primary/60"
            />
            <span className="m3-editable-pen" aria-hidden="true">
              <Icon name="edit" size={14} />
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-full bg-scrim/35 py-1 pr-3 pl-2.5 text-sm font-bold backdrop-blur-sm">
              <Icon name="globe" size={14} />
              <input
                {...register("country")}
                maxLength={200}
                aria-label="Страна"
                placeholder="Страна"
                size={Math.max(6, trip.country.length)}
                className="bg-transparent outline-none placeholder:text-on-primary/60"
              />
              <Icon name="edit" size={12} className="opacity-70" />
            </label>
            <button
              type="button"
              aria-expanded={panel === "dates"}
              onClick={() => setPanel(panel === "dates" ? null : "dates")}
              className="flex items-center gap-1.5 rounded-full bg-scrim/35 py-1 pr-3 pl-2.5 text-sm font-bold backdrop-blur-sm hover:bg-scrim/50"
            >
              <Icon name="calendar" size={14} />
              {startDate
                ? `${shortDate(startDate)} – ${endDate ? shortDate(endDate) : "…"}`
                : "Выберите даты"}
              {days > 0 ? ` · ${days} дн.` : ""}
              <Icon name="next" size={12} className="rotate-90 opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {panel === "cover" ? (
        <div className="m3-popover grid grid-cols-4 gap-2 p-3 sm:grid-cols-8">
          <label
            className="m3-cover-upload size-full min-h-14"
            aria-busy={uploading}
            title="Загрузить свою"
          >
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => {
                void onCoverFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {uploading ? (
              <span className="m3-loading scale-75" />
            ) : (
              <Icon name="upload" size={20} />
            )}
          </label>
          {TRIP_COVERS.map((item) => (
            <button
              key={item.src}
              type="button"
              aria-pressed={coverUrl === item.src}
              aria-label={item.label}
              onClick={() => {
                setValue("coverUrl", item.src, { shouldDirty: true });
                setPanel(null);
              }}
              className={`relative aspect-[4/3] overflow-hidden rounded-small ${
                coverUrl === item.src
                  ? "ring-2 ring-primary ring-offset-2"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {panel === "dates" ? (
        <div className="m3-popover flex flex-col gap-3">
          <RangeCalendar
            start={startDate}
            end={endDate}
            allowPast
            onChange={(nextStart, nextEnd) => {
              setValue("startDate", nextStart, { shouldDirty: true });
              setValue("endDate", nextEnd, {
                shouldDirty: true,
                shouldValidate: Boolean(nextEnd),
              });
            }}
          />
          <button
            type="button"
            disabled={!endDate}
            onClick={() => setPanel(null)}
            className="m3-button min-h-10 self-end py-1"
          >
            Готово
          </button>
        </div>
      ) : null}

      {errors.title || errors.country || errors.endDate ? (
        <FormError>
          {errors.title?.message ??
            errors.country?.message ??
            errors.endDate?.message ??
            ""}
        </FormError>
      ) : null}
      {outsideEvent ? (
        <FormError>
          {`В эти даты не попадает «${outsideEvent.title}». Перенесите событие или расширьте даты.`}
        </FormError>
      ) : null}

      {uploadFailed ? (
        <FormError>Нужна картинка JPEG или PNG до 10 МБ.</FormError>
      ) : null}

      <label className="m3-editable-note">
        <Icon name="edit" size={16} />
        <textarea
          {...register("description")}
          rows={2}
          placeholder="Добавьте описание"
          className="m3-autosize w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-on-surface-variant"
        />
      </label>

      {error ? (
        <FormError>Не удалось сохранить. Попробуйте ещё раз.</FormError>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isDirty || isPending || Boolean(outsideEvent) || !endDate}
        >
          <Icon name="check" size={18} />
          {isPending ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
