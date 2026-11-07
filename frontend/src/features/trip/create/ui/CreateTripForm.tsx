"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { DatePicker, FormError, FormField, SubmitButton } from "@shared/ui";

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
    control,
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
      className="m3-form"
      noValidate
    >
      <fieldset className="m3-form-section">
        <legend className="m3-label px-2 text-primary">Направление</legend>
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
      </fieldset>
      <fieldset className="m3-form-section">
        <legend className="m3-label px-2 text-primary">Даты путешествия</legend>
        <div className="grid min-w-0 gap-6">
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
                    label="Даты путешествия"
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
        </div>
      </fieldset>
      <fieldset className="m3-form-section">
        <legend className="m3-label px-2 text-primary">Детали поездки</legend>
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
