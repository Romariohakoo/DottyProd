"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Event } from "@entities/event";
import type { Trip } from "@entities/trip";
import { formatDate, getEventScheduleError } from "@shared/lib";
import { Button, DatePicker, FormError, FormField } from "@shared/ui";

import { useUpdateTripMutation } from "../model/use-update-trip-mutation";
import { type UpdateTripValues, updateTripSchema } from "../model/validation";

interface UpdateTripFormProps {
  trip: Trip;
  events: Event[];
  onSuccess?: () => void;
}

export function UpdateTripForm({
  trip,
  events,
  onSuccess,
}: UpdateTripFormProps) {
  const { mutate, isPending, error } = useUpdateTripMutation(trip.id);
  const {
    register,
    handleSubmit,
    control,
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

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const outsideEvent =
    startDate && endDate && startDate <= endDate
      ? events.find((event) =>
          getEventScheduleError(
            event.startAt,
            event.endAt ?? "",
            { startDate, endDate },
            [],
          ),
        )
      : undefined;
  const scheduleError = outsideEvent
    ? `Даты поездки не включают событие «${outsideEvent.title}». Сначала перенесите событие или расширьте даты поездки.`
    : undefined;

  const onSubmit = (values: UpdateTripValues) => {
    if (!isDirty || isPending) return;
    if (
      events.some((event) =>
        getEventScheduleError(event.startAt, event.endAt ?? "", values, []),
      )
    )
      return;
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
      <dl className="m3-details rounded-medium bg-surface-container px-6">
        <div className="m3-detail-row">
          <dt>Изменена</dt>
          <dd>
            <time dateTime={trip.updatedAt}>{formatDate(trip.updatedAt)}</time>
          </dd>
        </div>
      </dl>
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
                    aria-describedby={
                      scheduleError ? "trip-schedule-error" : undefined
                    }
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

      {scheduleError ? (
        <div id="trip-schedule-error">
          <FormError>{scheduleError}</FormError>
        </div>
      ) : null}
      {error ? (
        <FormError>
          Не удалось сохранить поездку. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <Button
        type="submit"
        disabled={!isValid || !isDirty || isPending || Boolean(scheduleError)}
        aria-busy={isPending}
        className={`mt-2 w-full ${isPending ? "m3-loading" : ""}`}
      >
        <span role={isPending ? "status" : undefined}>
          {isPending ? "Сохраняем…" : "Сохранить"}
        </span>
      </Button>
    </form>
  );
}
