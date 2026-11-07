"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Event } from "@entities/event";
import type { Place } from "@entities/place";
import type { Trip } from "@entities/trip";
import type { PlaceInputDto, PlaceRefDto } from "@shared/api";
import { getEventScheduleError } from "@shared/lib";
import {
  DatePicker,
  FormError,
  FormField,
  SelectField,
  SubmitButton,
} from "@shared/ui";

import { useCreateEventMutation } from "../model/use-create-event-mutation";
import { type CreateEventValues, createEventSchema } from "../model/validation";
import { PlaceChoiceFields } from "./PlaceChoiceFields";

interface CreateEventFormProps {
  tripId: number;
  trip: Trip;
  events: Event[];
  places: Place[];
  onSuccess?: () => void;
}

const EMPTY_PLACE: CreateEventValues["place"] = {
  mode: "none",
  id: "",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
};

const INITIAL_VALUES: CreateEventValues = {
  type: "activity",
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  bookingUrl: "",
  category: "other",
  transportType: "other",
  place: EMPTY_PLACE,
  fromPlace: EMPTY_PLACE,
  toPlace: EMPTY_PLACE,
};

const toPlaceChoice = (
  value: CreateEventValues["place"],
): PlaceInputDto | PlaceRefDto =>
  value.mode === "existing"
    ? { id: Number(value.id) }
    : {
        name: value.name.trim(),
        address: value.address.trim() || null,
        latitude: Number(value.latitude),
        longitude: Number(value.longitude),
      };

export function CreateEventForm({
  tripId,
  trip,
  events,
  places,
  onSuccess,
}: CreateEventFormProps) {
  const { mutate, isPending, error } = useCreateEventMutation(tripId);
  const form = useForm<CreateEventValues>({
    defaultValues: INITIAL_VALUES,
    mode: "onTouched",
    resolver: zodResolver(createEventSchema),
  });
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = form;
  const type = useWatch({ control: form.control, name: "type" });

  const [startAt, endAt] = useWatch({
    control: form.control,
    name: ["startAt", "endAt"],
  });
  const scheduleError = getEventScheduleError(startAt, endAt, trip, events);

  const onSubmit = (values: CreateEventValues) => {
    if (getEventScheduleError(values.startAt, values.endAt, trip, events))
      return;
    const common = {
      title: values.title.trim(),
      description: values.description || null,
      startAt: new Date(values.startAt).toISOString(),
      endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
      bookingUrl: values.bookingUrl.trim() || null,
    };
    mutate(
      values.type === "activity"
        ? {
            ...common,
            type: "activity",
            category: values.category,
            place:
              values.place.mode === "none" ? null : toPlaceChoice(values.place),
          }
        : {
            ...common,
            type: "movement",
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
          <SelectField
            label="Тип события"
            error={errors.type?.message}
            id="event-type"
            {...register("type", {
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                const nextType = event.target.value;
                if (nextType === "activity" || nextType === "movement") {
                  resetField("category", { defaultValue: "other" });
                  resetField("transportType", { defaultValue: "other" });
                  resetField("place", { defaultValue: EMPTY_PLACE });
                  resetField("fromPlace", { defaultValue: EMPTY_PLACE });
                  resetField("toPlace", { defaultValue: EMPTY_PLACE });
                }
              },
            })}
          >
            <option value="activity">Активность</option>
            <option value="movement">Перемещение</option>
          </SelectField>
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
          {type === "activity" ? (
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
          Не удалось создать событие. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}
      <SubmitButton
        pending={isPending}
        disabled={Boolean(scheduleError)}
        pendingLabel="Создаём событие…"
      >
        Создать событие
      </SubmitButton>
    </form>
  );
}
