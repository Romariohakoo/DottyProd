"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useCreatePlaceMutation } from "../model/use-create-place-mutation";
import { type CreatePlaceValues, createPlaceSchema } from "../model/validation";

interface CreatePlaceFormProps {
  tripId: number;
  onSuccess?: () => void;
}

export function CreatePlaceForm({ tripId, onSuccess }: CreatePlaceFormProps) {
  const { mutate, isPending, error } = useCreatePlaceMutation(tripId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlaceValues>({
    defaultValues: { name: "", address: "" },
    mode: "onTouched",
    resolver: zodResolver(createPlaceSchema),
  });

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
      className="flex flex-col gap-5"
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
          Не удалось создать место. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Создаём место…">
        Создать место
      </SubmitButton>
    </form>
  );
}
