"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button, FormError, FormField } from "@shared/ui";

import { useCreatePlaceMutation } from "../model/use-create-place-mutation";
import { type CreatePlaceValues, createPlaceSchema } from "../model/validation";
import { PlaceAddressSearch } from "./PlaceAddressSearch";

interface CreatePlaceFormProps {
  tripId: number;
  onSuccess?: () => void;
}

export function CreatePlaceForm({ tripId, onSuccess }: CreatePlaceFormProps) {
  const { mutate, isPending, error } = useCreatePlaceMutation(tripId);
  const form = useForm<CreatePlaceValues>({
    defaultValues: { name: "", address: "", latitude: NaN, longitude: NaN },
    mode: "onTouched",
    resolver: zodResolver(createPlaceSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

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
        <PlaceAddressSearch form={form} />
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
