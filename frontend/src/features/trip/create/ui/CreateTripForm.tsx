"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useCreateTripMutation } from "../model/use-create-trip-mutation";
import { type CreateTripValues, createTripSchema } from "../model/validation";

interface CreateTripFormProps {
  onSuccess?: () => void;
}

const INITIAL_VALUES: CreateTripValues = {
  title: "",
  country: "",
  startDate: "",
  endDate: "",
  description: "",
  coverUrl: "",
};

export function CreateTripForm({ onSuccess }: CreateTripFormProps) {
  const { mutate, isPending, error } = useCreateTripMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTripValues>({
    defaultValues: INITIAL_VALUES,
    mode: "onTouched",
    resolver: zodResolver(createTripSchema),
  });

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
      className="flex flex-col gap-5"
      noValidate
    >
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
          Не удалось создать поездку. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Создаём поездку…">
        Создать поездку
      </SubmitButton>
    </form>
  );
}
