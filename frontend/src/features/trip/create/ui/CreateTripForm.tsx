"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { LocalityInput } from "@entities/place";
import { uploadMedia } from "@shared/api";
import { TRIP_COVERS } from "@shared/config";
import { mediaUrl } from "@shared/lib";
import { FormError, Icon, RangeCalendar, SubmitButton } from "@shared/ui";

import { useCreateTripMutation } from "../model/use-create-trip-mutation";
import { type CreateTripValues, createTripSchema } from "../model/validation";

interface CreateTripFormProps {
  defaultValues?: Partial<CreateTripValues>;
  onSuccess?: () => void;
}

const INITIAL_VALUES: CreateTripValues = {
  title: "",
  country: "",
  startDate: "",
  endDate: "",
  description: "",
  coverUrl: TRIP_COVERS[0].src,
};

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

const short = (value: string) => {
  const [, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

const plural = (count: number, one: string, few: string, many: string) =>
  count % 10 === 1 && count % 100 !== 11
    ? one
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? few
      : many;

export function CreateTripForm({
  defaultValues,
  onSuccess,
}: CreateTripFormProps) {
  const { mutate, isPending, error } = useCreateTripMutation();
  const [destination, setDestination] = useState("");
  const [titleEdited, setTitleEdited] = useState(Boolean(defaultValues?.title));
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateTripValues>({
    defaultValues: { ...INITIAL_VALUES, ...defaultValues },
    mode: "onTouched",
    resolver: zodResolver(createTripSchema),
  });
  const [coverUrl, startDate, endDate] = useWatch({
    control,
    name: ["coverUrl", "startDate", "endDate"],
  });
  const days =
    startDate && endDate
      ? Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) +
        1
      : 0;

  const onSubmit = (values: CreateTripValues) => {
    mutate(
      {
        ...values,
        title: values.title.trim(),
        country: values.country.trim(),
        description: values.description.trim() || null,
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
      setCustomCover(url);
      setValue("coverUrl", url);
    } catch {
      setUploadFailed(true);
    } finally {
      setUploading(false);
    }
  };

  const covers = [
    ...(customCover ? [{ src: customCover, label: "Своя обложка" }] : []),
    ...TRIP_COVERS,
  ];

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="m3-newtrip-where">
        <LocalityInput
          kind="locality"
          label="Куда"
          icon="pin"
          placeholder="Город или регион"
          autoFocus
          value={destination}
          onChange={(value) => {
            setDestination(value);
            if (!titleEdited)
              setValue(
                "title",
                value.trim()
                  ? `Поездка: ${value.trim()[0].toLocaleUpperCase("ru-RU")}${value.trim().slice(1)}`
                  : "",
              );
          }}
          onPick={(locality) => {
            if (locality.country)
              setValue("country", locality.country, { shouldValidate: true });
            if (!titleEdited)
              setValue("title", `Поездка: ${locality.name}`, {
                shouldValidate: true,
              });
          }}
        />
        <Controller
          name="country"
          control={control}
          render={({ field, fieldState }) => (
            <LocalityInput
              kind="country"
              label="Страна"
              icon="globe"
              placeholder="Россия"
              value={field.value}
              invalid={Boolean(fieldState.error)}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <section className="m3-newtrip-dates" aria-label="Даты">
        <header>
          <Icon name="calendar" size={18} />
          <b>
            {startDate
              ? `${short(startDate)}${endDate ? ` – ${short(endDate)}` : ""}`
              : "Выберите даты"}
          </b>
          {days ? (
            <span className="m3-chip" data-tone="lavender">
              {days} {plural(days, "день", "дня", "дней")}
            </span>
          ) : null}
        </header>
        <RangeCalendar
          start={startDate}
          end={endDate}
          onChange={(start, end) => {
            setValue("startDate", start, { shouldValidate: Boolean(end) });
            setValue("endDate", end, { shouldValidate: Boolean(end) });
          }}
        />
      </section>

      <label className="m3-newtrip-title">
        <span className="m3-locality-label">Название</span>
        <input
          type="text"
          maxLength={200}
          placeholder="Поездка: Казань"
          {...register("title", { onChange: () => setTitleEdited(true) })}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="m3-locality-label mb-2">Обложка</legend>
        <div className="m3-cover-row">
          <label
            className="m3-cover-upload"
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
          {covers.map((cover) => (
            <button
              key={cover.src}
              type="button"
              aria-label={cover.label}
              aria-pressed={coverUrl === cover.src}
              onClick={() => setValue("coverUrl", cover.src)}
              className="m3-cover-option"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(cover.src) ?? cover.src} alt="" />
              {coverUrl === cover.src ? (
                <span className="m3-cover-check">
                  <Icon name="check" size={12} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {uploadFailed ? (
          <FormError>
            Не удалось загрузить картинку. Нужен JPEG или PNG до 10 МБ.
          </FormError>
        ) : null}
      </fieldset>

      {errors.country || errors.title || errors.startDate || errors.endDate ? (
        <FormError>
          {errors.title?.message ??
            errors.country?.message ??
            (errors.startDate || errors.endDate
              ? "Выберите даты начала и конца"
              : "")}
        </FormError>
      ) : null}
      {error ? (
        <FormError>Не удалось создать поездку. Попробуйте ещё раз.</FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Создаём…">
        Создать поездку
      </SubmitButton>
    </form>
  );
}
