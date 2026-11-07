"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Place } from "@entities/place";
import { Button, FormError, FormField } from "@shared/ui";

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
      className="m3-form"
      noValidate
    >
      <fieldset disabled={isPending} className="m3-form">
        <div className="m3-form-section" role="group" aria-label="О месте">
          <h3 className="m3-title">О месте</h3>
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
        </div>
        <div className="m3-form-section" role="group" aria-label="Координаты">
          <h3 className="m3-title">Координаты</h3>
          <div className="grid min-w-0 gap-6 sm:grid-cols-2">
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
          </div>
        </div>
      </fieldset>

      {error ? (
        <FormError>
          Не удалось сохранить место. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <Button
        type="submit"
        disabled={!isValid || !isDirty || isPending}
        aria-busy={isPending}
        className="mt-2 w-full"
      >
        <span role={isPending ? "status" : undefined}>
          {isPending ? "Сохраняем…" : "Сохранить"}
        </span>
      </Button>
    </form>
  );
}
