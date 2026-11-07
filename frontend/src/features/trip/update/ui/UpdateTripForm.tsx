"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Trip } from "@entities/trip";
import { FormError, FormField } from "@shared/ui";

import { useUpdateTripMutation } from "../model/use-update-trip-mutation";
import { type UpdateTripValues, updateTripSchema } from "../model/validation";

interface UpdateTripFormProps {
  trip: Trip;
  onSuccess?: () => void;
}

export function UpdateTripForm({ trip, onSuccess }: UpdateTripFormProps) {
  const { mutate, isPending, error } = useUpdateTripMutation(trip.id);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
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

  const onSubmit = (values: UpdateTripValues) => {
    if (!isDirty || isPending) return;
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
      className="flex flex-col gap-5"
      noValidate
    >
      <dl className="grid gap-2 break-words text-sm">
        <dt className="text-foreground/70">ID</dt>
        <dd>{trip.id}</dd>
        <dt className="text-foreground/70">Создана</dt>
        <dd>{trip.createdAt}</dd>
        <dt className="text-foreground/70">Изменена</dt>
        <dd>{trip.updatedAt}</dd>
      </dl>
      <FormField
        label="Название поездки"
        type="text"
        maxLength={200}
        error={errors.title?.message}
        {...register("title")}
      />
      <FormField
        label="Страна"
        type="text"
        maxLength={200}
        error={errors.country?.message}
        {...register("country")}
      />
      <FormField
        label="Дата начала"
        type="date"
        error={errors.startDate?.message}
        {...register("startDate")}
      />
      <FormField
        label="Дата окончания"
        type="date"
        error={errors.endDate?.message}
        {...register("endDate")}
      />
      <FormField
        label="Описание (необязательно)"
        type="text"
        error={errors.description?.message}
        {...register("description")}
      />
      <FormField
        label="Путь к обложке (необязательно)"
        type="text"
        maxLength={2048}
        error={errors.coverUrl?.message}
        {...register("coverUrl")}
      />

      {error ? (
        <FormError>
          Не удалось сохранить поездку. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <button
        type="submit"
        disabled={!isValid || !isDirty || isPending}
        className="mt-2 w-full cursor-pointer rounded-lg bg-accent px-5 py-3 text-base font-semibold text-foreground transition-colors enabled:hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
