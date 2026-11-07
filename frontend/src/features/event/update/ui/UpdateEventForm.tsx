"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Event } from "@entities/event";
import type { Place } from "@entities/place";
import type { PlaceInputDto, PlaceRefDto } from "@shared/api";
import { FormError, FormField } from "@shared/ui";

import { useUpdateEventMutation } from "../model/use-update-event-mutation";
import { type UpdateEventValues, updateEventSchema } from "../model/validation";
import { PlaceChoiceFields } from "./PlaceChoiceFields";

interface UpdateEventFormProps {
  tripId: number;
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

  const onSubmit = (values: UpdateEventValues) => {
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
      className="flex flex-col gap-5"
      noValidate
    >
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
        <dl className="grid gap-2 break-words text-sm">
          <dt className="text-foreground/70">ID</dt>
          <dd>{event.id}</dd>
          <dt className="text-foreground/70">Поездка</dt>
          <dd>{tripId}</dd>
          <dt className="text-foreground/70">Тип</dt>
          <dd>{event.type}</dd>
          <dt className="text-foreground/70">Автор</dt>
          <dd>{event.createdBy}</dd>
        </dl>
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
        <p className="text-sm text-foreground/70">
          Дата и время указаны в часовом поясе вашего устройства.
        </p>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <FormField
            label="Начало"
            type="datetime-local"
            step="1"
            error={errors.startAt?.message}
            {...register("startAt")}
          />
          <FormField
            label="Окончание (необязательно)"
            type="datetime-local"
            step="1"
            error={errors.endAt?.message}
            {...register("endAt")}
          />
        </div>
        <FormField
          label="Ссылка на бронь (необязательно)"
          type="text"
          error={errors.bookingUrl?.message}
          {...register("bookingUrl")}
        />
        {event.type === "activity" ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="event-category" className="text-sm font-medium">
                Категория
              </label>
              <select
                id="event-category"
                {...register("category")}
                className="w-full rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
              >
                <option value="excursion">Экскурсия</option>
                <option value="museum">Музей</option>
                <option value="theater">Театр</option>
                <option value="walk">Прогулка</option>
                <option value="accommodation">Проживание</option>
                <option value="restaurant">Ресторан</option>
                <option value="meeting">Встреча</option>
                <option value="other">Другое</option>
              </select>
            </div>
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
            <div className="flex flex-col gap-2">
              <label htmlFor="event-transport" className="text-sm font-medium">
                Транспорт
              </label>
              <select
                id="event-transport"
                {...register("transportType")}
                className="w-full rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
              >
                <option value="walk">Пешком</option>
                <option value="car">Автомобиль</option>
                <option value="train">Поезд</option>
                <option value="plane">Самолёт</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
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
      </fieldset>
      {error ? (
        <FormError>
          Не удалось сохранить событие. Проверьте данные и попробуйте ещё раз.
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
