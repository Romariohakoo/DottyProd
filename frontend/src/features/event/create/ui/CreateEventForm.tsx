"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { Place } from "@entities/place";
import type { PlaceInputDto, PlaceRefDto } from "@shared/api";
import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useCreateEventMutation } from "../model/use-create-event-mutation";
import { type CreateEventValues, createEventSchema } from "../model/validation";
import { PlaceChoiceFields } from "./PlaceChoiceFields";

interface CreateEventFormProps {
  tripId: number;
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
    getValues,
    reset,
    formState: { errors },
  } = form;
  const type = useWatch({ control: form.control, name: "type" });

  const onSubmit = (values: CreateEventValues) => {
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
      className="flex flex-col gap-5"
      noValidate
    >
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="event-type" className="text-sm font-medium">
            Тип события
          </label>
          <select
            id="event-type"
            {...register("type", {
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                const nextType = event.target.value;
                if (nextType === "activity" || nextType === "movement") {
                  const values = getValues();
                  reset({
                    ...values,
                    type: nextType,
                    category: "other",
                    transportType: "other",
                    place: EMPTY_PLACE,
                    fromPlace: EMPTY_PLACE,
                    toPlace: EMPTY_PLACE,
                  });
                }
              },
            })}
            className="w-full rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          >
            <option value="activity">Активность</option>
            <option value="movement">Перемещение</option>
          </select>
        </div>
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
        {type === "activity" ? (
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
          Не удалось создать событие. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Создаём событие…">
        Создать событие
      </SubmitButton>
    </form>
  );
}
