"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Place } from "@entities/place";
import { FormError, FormField } from "@shared/ui";

import { useUpdatePlaceMutation } from "../model/use-update-place-mutation";
import { type UpdatePlaceValues, updatePlaceSchema } from "../model/validation";

interface UpdatePlaceFormProps {
  tripId: number;
  place: Place;
  onSuccess?: () => void;
}

export function UpdatePlaceForm({
  tripId,
  place,
  onSuccess,
}: UpdatePlaceFormProps) {
  const { mutate, isPending, error } = useUpdatePlaceMutation(tripId, place.id);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<UpdatePlaceValues>({
    defaultValues: {
      name: place.name,
      address: place.address ?? "",
      latitude: place.latitude,
      longitude: place.longitude,
    },
    mode: "onChange",
    resolver: zodResolver(updatePlaceSchema),
  });

  const onSubmit = (values: UpdatePlaceValues) => {
    if (!isValid || !isDirty || isPending) return;
    mutate(
      {
        name: values.name.trim(),
        address: values.address.trim() || null,
        latitude: values.latitude,
        longitude: values.longitude,
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
      <p className="text-sm text-foreground/70">ID места: {place.id}</p>
      <fieldset disabled={isPending} className="flex flex-col gap-5">
        <FormField
          label="Название места"
          type="text"
          maxLength={200}
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          label="Адрес (необязательно)"
          type="text"
          maxLength={1000}
          error={errors.address?.message}
          {...register("address")}
        />
        <FormField
          label="Широта"
          type="number"
          step="any"
          min={-90}
          max={90}
          error={errors.latitude?.message}
          {...register("latitude", { valueAsNumber: true })}
        />
        <FormField
          label="Долгота"
          type="number"
          step="any"
          min={-180}
          max={180}
          error={errors.longitude?.message}
          {...register("longitude", { valueAsNumber: true })}
        />
      </fieldset>

      {error ? (
        <FormError>
          Не удалось сохранить место. Проверьте данные и попробуйте ещё раз.
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
