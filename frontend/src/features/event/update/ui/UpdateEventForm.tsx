"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Event } from "@entities/event";
import type { Place } from "@entities/place";
import type { Trip } from "@entities/trip";
import type { PlaceInputDto, PlaceRefDto } from "@shared/api";
import { getEventScheduleError } from "@shared/lib";
import {
  Button,
  DatePicker,
  FormError,
  FormField,
  SelectField,
} from "@shared/ui";

import { useUpdateEventMutation } from "../model/use-update-event-mutation";
import { type UpdateEventValues, updateEventSchema } from "../model/validation";
import { PlaceChoiceFields } from "./PlaceChoiceFields";

interface UpdateEventFormProps {
  tripId: number;
  trip: Trip;
  events: Event[];
  event: Event;
  places: Place[];
  onSuccess?: () => void;
}

const EMPTY_PLACE: UpdateEventValues["place"] = {
  mode: "none",
  id: "",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
};

const getPlaceValues = (place: Place | null): UpdateEventValues["place"] =>
  place
    ? { ...EMPTY_PLACE, mode: "existing", id: String(place.id) }
    : EMPTY_PLACE;

const toPlaceChoice = (
  value: UpdateEventValues["place"],
): PlaceInputDto | PlaceRefDto =>
  value.mode === "existing"
    ? { id: Number(value.id) }
    : {
        name: value.name.trim(),
        address: value.address.trim() || null,
        latitude: Number(value.latitude),
        longitude: Number(value.longitude),
      };

const toLocalDateTime = (value: string): string => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, -1);
};

export function UpdateEventForm({
  tripId,
  trip,
  events,
  event,
  places,
  onSuccess,
}: UpdateEventFormProps) {
  const { mutate, isPending, error } = useUpdateEventMutation(tripId, event.id);
  const initialValues: UpdateEventValues = {
    type: event.type,
    title: event.title,
    description: event.description ?? "",
    startAt: toLocalDateTime(event.startAt),
    endAt: event.endAt ? toLocalDateTime(event.endAt) : "",
    bookingUrl: event.bookingUrl ?? "",
    category: event.type === "activity" ? event.category : "other",
    transportType: event.type === "movement" ? event.transportType : "other",
    place: getPlaceValues(event.type === "activity" ? event.place : null),
    fromPlace: getPlaceValues(
      event.type === "movement" ? event.fromPlace : null,
    ),
    toPlace: getPlaceValues(event.type === "movement" ? event.toPlace : null),
  };
  const form = useForm<UpdateEventValues>({
    defaultValues: initialValues,
    mode: "onChange",
    resolver: zodResolver(updateEventSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = form;

  const [startAt, endAt] = useWatch({
    control: form.control,
    name: ["startAt", "endAt"],
  });
  const scheduleError = getEventScheduleError(
    startAt,
    endAt,
    trip,
    events,
    event.id,
  );

  const onSubmit = (values: UpdateEventValues) => {
    if (
      getEventScheduleError(
        values.startAt,
        values.endAt,
        trip,
        events,
        event.id,
      )
    )
      return;
    if (!isValid || !isDirty || isPending) return;
    const common = {
      title: values.title.trim(),
      description: values.description || null,
      startAt: new Date(values.startAt).toISOString(),
      endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
      bookingUrl: values.bookingUrl.trim() || null,
    };
    mutate(
      event.type === "activity"
        ? {
            ...common,
            type: event.type,
            category: values.category,
            place:
              values.place.mode === "none" ? null : toPlaceChoice(values.place),
          }
        : {
            ...common,
            type: event.type,
            transportType: values.transportType,
            fromPlace: toPlaceChoice(values.fromPlace),
            toPlace: toPlaceChoice(values.toPlace),
          },
      { onSuccess: () => onSuccess?.() },
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
        <div className="m3-form-section" role="group" aria-label="О событии">
          <h3 className="m3-title">О событии</h3>
          <p className="m3-badge self-start">
            {event.type === "activity" ? "Активность" : "Перемещение"}
          </p>
          <FormField
            label="Название"
            type="text"
            error={errors.title?.message}
            {...register("title")}
          />
          <FormField
            label="Описание (необязательно)"
            type="text"
            error={errors.description?.message}
            {...register("description")}
          />
        </div>
        <div
          className="m3-form-section"
          role="group"
          aria-label="Время и бронирование"
        >
          <h3 className="m3-title">Время и бронирование</h3>
          <p className="m3-support">
            Дата и время указаны в часовом поясе вашего устройства.
          </p>
          <div className="grid min-w-0 gap-6">
            <Controller
              name="startAt"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  label="Начало"
                  id="event-start-at"
                  withTime
                  min={trip.startDate}
                  max={trip.endDate}
                  disabled={isPending}
                  error={errors.startAt?.message}
                  aria-describedby={
                    scheduleError ? "event-schedule-error" : undefined
                  }
                />
              )}
            />
            <Controller
              name="endAt"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  label="Окончание (необязательно)"
                  id="event-end-at"
                  withTime
                  min={trip.startDate}
                  max={trip.endDate}
                  disabled={isPending}
                  error={errors.endAt?.message}
                  aria-describedby={
                    scheduleError ? "event-schedule-error" : undefined
                  }
                />
              )}
            />
          </div>
          {scheduleError ? (
            <div id="event-schedule-error">
              <FormError>{scheduleError}</FormError>
            </div>
          ) : null}
          <FormField
            label="Ссылка на бронь (необязательно)"
            type="text"
            error={errors.bookingUrl?.message}
            {...register("bookingUrl")}
          />
        </div>
        <div
          className="m3-form-section"
          role="group"
          aria-label="Детали и места"
        >
          <h3 className="m3-title">Детали и места</h3>
          {event.type === "activity" ? (
            <>
              <SelectField
                label="Категория"
                error={errors.category?.message}
                id="event-category"
                {...register("category")}
              >
                <option value="excursion">Экскурсия</option>
                <option value="museum">Музей</option>
                <option value="theater">Театр</option>
                <option value="walk">Прогулка</option>
                <option value="accommodation">Проживание</option>
                <option value="restaurant">Ресторан</option>
                <option value="meeting">Встреча</option>
                <option value="other">Другое</option>
              </SelectField>
              <PlaceChoiceFields
                name="place"
                label="Место"
                optional
                places={places}
                form={form}
              />
            </>
          ) : (
            <>
              <SelectField
                label="Транспорт"
                error={errors.transportType?.message}
                id="event-transport"
                {...register("transportType")}
              >
                <option value="walk">Пешком</option>
                <option value="car">Автомобиль</option>
                <option value="train">Поезд</option>
                <option value="plane">Самолёт</option>
                <option value="other">Другое</option>
              </SelectField>
              <div className="grid min-w-0 gap-6 sm:grid-cols-2">
                <PlaceChoiceFields
                  name="fromPlace"
                  label="Откуда"
                  places={places}
                  form={form}
                />
                <PlaceChoiceFields
                  name="toPlace"
                  label="Куда"
                  places={places}
                  form={form}
                />
              </div>
            </>
          )}
        </div>
      </fieldset>
      {error ? (
        <FormError>
          Не удалось сохранить событие. Проверьте данные и попробуйте ещё раз.
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
