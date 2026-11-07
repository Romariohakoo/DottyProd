"use client";

import { type UseFormReturn, useWatch } from "react-hook-form";

import type { Place } from "@entities/place";
import { FormField, SelectField } from "@shared/ui";

import type { UpdateEventValues } from "../model/validation";

interface PlaceChoiceFieldsProps {
  name: "place" | "fromPlace" | "toPlace";
  label: string;
  places: Place[];
  form: UseFormReturn<UpdateEventValues>;
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
    <fieldset className="m3-group bg-surface-bright">
      <legend>{label}</legend>
      <SelectField
        label="Способ выбора"
        id={`${name}-mode`}
        error={errors?.mode?.message}
        {...form.register(`${name}.mode`)}
      >
        <option value="none">
          {optional ? "Без места" : "Выберите способ"}
        </option>
        <option value="existing">Существующее место</option>
        <option value="new">Новое место</option>
      </SelectField>
      {mode === "existing" ? (
        <div className="m3-field">
          <SelectField
            label="Место поездки"
            id={`${name}-id`}
            error={errors?.id?.message}
            {...form.register(`${name}.id`)}
          >
            <option value="">Выберите место</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </SelectField>
          {places.length === 0 ? (
            <p className="m3-support">
              В поездке пока нет мест. Выберите создание нового.
            </p>
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
          <div className="grid min-w-0 gap-4">
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
          </div>
        </>
      ) : null}
    </fieldset>
  );
}
