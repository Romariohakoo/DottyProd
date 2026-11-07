"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { TRIP_COVERS } from "@shared/config";
import {
  DatePicker,
  FormError,
  FormField,
  Icon,
  SubmitButton,
} from "@shared/ui";

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

export function CreateTripForm({
  defaultValues,
  onSuccess,
}: CreateTripFormProps) {
  const { mutate, isPending, error } = useCreateTripMutation();
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
  const coverUrl = useWatch({ control, name: "coverUrl" });

  const onSubmit = (values: CreateTripValues) => {
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

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="m3-form"
      noValidate
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="h-36 w-full rounded-large object-cover"
        />
      ) : null}
      <FormField
        label="Название"
        type="text"
        maxLength={200}
        placeholder="Например, четыре дня в Казани"
        error={errors.title?.message}
        {...register("title")}
      />
      <FormField
        label="Страна"
        type="text"
        maxLength={200}
        placeholder="Россия"
        error={errors.country?.message}
        {...register("country")}
      />
      <Controller
        name="startDate"
        control={control}
        render={({ field, fieldState }) => (
          <Controller
            name="endDate"
            control={control}
            render={({ field: endField, fieldState: endState }) => (
              <DatePicker
                {...field}
                label="Даты"
                endValue={endField.value}
                onEndChange={endField.onChange}
                requireEnd
                disabled={isPending}
                error={fieldState.error?.message || endState.error?.message}
              />
            )}
          />
        )}
      />
      <FormField
        label="Описание — необязательно"
        type="text"
        placeholder="Что хотите увидеть, с кем едете"
        error={errors.description?.message}
        {...register("description")}
      />
      <fieldset className="m3-field">
        <legend className="m3-label mb-2">Обложка</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TRIP_COVERS.map((cover) => (
            <button
              key={cover.src}
              type="button"
              aria-label={cover.label}
              aria-pressed={coverUrl === cover.src}
              onClick={() => setValue("coverUrl", cover.src)}
              className={`relative aspect-[4/3] overflow-hidden rounded-small ${
                coverUrl === cover.src
                  ? "ring-2 ring-primary ring-offset-2"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.src} alt="" className="size-full object-cover" />
              {coverUrl === cover.src ? (
                <span className="m3-dot absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-on-primary">
                  <Icon name="check" size={12} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      {error ? (
        <FormError>
          Не удалось создать поездку. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Создаём поездку…">
        Создать поездку
      </SubmitButton>
    </form>
  );
}
