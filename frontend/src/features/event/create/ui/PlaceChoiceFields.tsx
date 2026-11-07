"use client";

import { type UseFormReturn, useWatch } from "react-hook-form";

import type { Place } from "@entities/place";
import { FormField } from "@shared/ui";

import type { CreateEventValues } from "../model/validation";

interface PlaceChoiceFieldsProps {
  name: "place" | "fromPlace" | "toPlace";
  label: string;
  places: Place[];
  form: UseFormReturn<CreateEventValues>;
  optional?: boolean;
}

export function PlaceChoiceFields({
  name,
  label,
  places,
  form,
  optional = false,
}: PlaceChoiceFieldsProps) {
  const mode = useWatch({ control: form.control, name: `${name}.mode` });
  const errors = form.formState.errors[name];

  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg border border-muted/60 bg-muted/10 p-4">
      <legend className="px-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${name}-mode`} className="text-sm font-medium">
          Способ выбора
        </label>
        <select
          id={`${name}-mode`}
          {...form.register(`${name}.mode`)}
          aria-invalid={errors?.mode ? true : undefined}
          aria-describedby={errors?.mode ? `${name}-mode-error` : undefined}
          className="w-full rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
        >
          <option value="none">
            {optional ? "Без места" : "Выберите способ"}
          </option>
          <option value="existing">Существующее место</option>
          <option value="new">Новое место</option>
        </select>
        {errors?.mode ? (
          <span
            id={`${name}-mode-error`}
            role="alert"
            className="text-sm text-foreground/80"
          >
            {errors.mode.message}
          </span>
        ) : null}
      </div>
      {mode === "existing" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${name}-id`} className="text-sm font-medium">
            Место поездки
          </label>
          <select
            id={`${name}-id`}
            {...form.register(`${name}.id`)}
            aria-invalid={errors?.id ? true : undefined}
            aria-describedby={errors?.id ? `${name}-id-error` : undefined}
            className="w-full rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          >
            <option value="">Выберите место</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name} (#{place.id})
              </option>
            ))}
          </select>
          {places.length === 0 ? (
            <p className="text-sm text-foreground/70">
              В поездке пока нет мест. Выберите создание нового.
            </p>
          ) : null}
          {errors?.id ? (
            <span
              id={`${name}-id-error`}
              role="alert"
              className="text-sm text-foreground/80"
            >
              {errors.id.message}
            </span>
          ) : null}
        </div>
      ) : null}
      {mode === "new" ? (
        <>
          <FormField
            label="Название места"
            type="text"
            error={errors?.name?.message}
            {...form.register(`${name}.name`)}
          />
          <FormField
            label="Адрес (необязательно)"
            type="text"
            error={errors?.address?.message}
            {...form.register(`${name}.address`)}
          />
          <FormField
            label="Широта"
            type="number"
            step="any"
            min={-90}
            max={90}
            error={errors?.latitude?.message}
            {...form.register(`${name}.latitude`)}
          />
          <FormField
            label="Долгота"
            type="number"
            step="any"
            min={-180}
            max={180}
            error={errors?.longitude?.message}
            {...form.register(`${name}.longitude`)}
          />
        </>
      ) : null}
    </fieldset>
  );
}
