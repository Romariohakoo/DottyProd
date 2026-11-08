"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { PlaceAddressSearch } from "@entities/place";
import { Button, FormError, FormField } from "@shared/ui";

import { useCreatePlaceMutation } from "../model/use-create-place-mutation";
import { type CreatePlaceValues, createPlaceSchema } from "../model/validation";

interface CreatePlaceFormProps {
  tripId: number;
  initialValues?: Partial<CreatePlaceValues>;
  onSuccess?: () => void;
}

export function CreatePlaceForm({
  tripId,
  initialValues,
  onSuccess,
}: CreatePlaceFormProps) {
  const { mutate, isPending, error } = useCreatePlaceMutation(tripId);
  const hasInitialCoordinates =
    Number.isFinite(initialValues?.latitude) &&
    Number.isFinite(initialValues?.longitude);
  const form = useForm<CreatePlaceValues>({
    defaultValues: {
      name: initialValues?.name ?? "",
      address: initialValues?.address ?? "",
      latitude: initialValues?.latitude ?? NaN,
      longitude: initialValues?.longitude ?? NaN,
    },
    mode: "onTouched",
    resolver: zodResolver(createPlaceSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const address = useWatch({ control: form.control, name: "address" });

  const onSubmit = (values: CreatePlaceValues) => {
    mutate(
      {
        ...values,
        name: values.name.trim(),
        address: values.address.trim() || null,
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
      <fieldset disabled={isPending} className="flex flex-col gap-5">
        <FormField
          label="Название места"
          type="text"
          maxLength={200}
          error={errors.name?.message}
          {...register("name")}
        />
        <input
          type="hidden"
          {...register("latitude", { valueAsNumber: true })}
        />
        <input
          type="hidden"
          {...register("longitude", { valueAsNumber: true })}
        />
        <PlaceAddressSearch
          id="place-address"
          address={address}
          error={
            errors.address?.message ??
            (errors.latitude || errors.longitude
              ? "Найдите адрес, чтобы определить расположение места."
              : undefined)
          }
          onAddressChange={(value) => {
            form.setValue("address", value, { shouldDirty: true });
            if (!hasInitialCoordinates) {
              form.resetField("latitude");
              form.resetField("longitude");
            }
            form.clearErrors(["address", "latitude", "longitude"]);
          }}
          onSelect={(result) => {
            if (!result.geometry) return;
            const [longitude, latitude] = result.geometry.coordinates;
            form.setValue("longitude", longitude, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue("latitude", latitude, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue(
              "address",
              [result.properties.description, result.properties.name]
                .filter(Boolean)
                .join(", "),
              { shouldDirty: true, shouldValidate: true },
            );
          }}
        />
      </fieldset>

      {error ? (
        <FormError>
          Не удалось создать место. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <Button
        type="submit"
        variant="outlined"
        disabled={isPending}
        aria-busy={isPending}
        className={`mt-2 w-full ${isPending ? "m3-loading" : ""}`}
      >
        <span role={isPending ? "status" : undefined}>
          {isPending ? "Создаём место…" : "Создать место"}
        </span>
      </Button>
    </form>
  );
}
