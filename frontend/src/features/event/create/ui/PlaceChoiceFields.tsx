"use client";

import { type UseFormReturn, useWatch } from "react-hook-form";

import { PlaceAddressSearch, type Place } from "@entities/place";
import { FormField, SelectField } from "@shared/ui";

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
  const address = useWatch({ control: form.control, name: `${name}.address` });

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
          <input type="hidden" {...form.register(`${name}.latitude`)} />
          <input type="hidden" {...form.register(`${name}.longitude`)} />
          <PlaceAddressSearch
            id={`${name}-address`}
            address={address}
            error={
              errors?.address?.message ??
              (errors?.latitude || errors?.longitude
                ? "Найдите адрес, чтобы определить расположение места."
                : undefined)
            }
            onAddressChange={(value) => {
              form.setValue(`${name}.address`, value, { shouldDirty: true });
              form.setValue(`${name}.latitude`, "", { shouldDirty: true });
              form.setValue(`${name}.longitude`, "", { shouldDirty: true });
              form.clearErrors([
                `${name}.address`,
                `${name}.latitude`,
                `${name}.longitude`,
              ]);
            }}
            onSelect={(result) => {
              if (!result.geometry) return;
              const [longitude, latitude] = result.geometry.coordinates;
              form.setValue(`${name}.longitude`, String(longitude), {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue(`${name}.latitude`, String(latitude), {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue(
                `${name}.address`,
                [result.properties.description, result.properties.name]
                  .filter(Boolean)
                  .join(", "),
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          />
        </>
      ) : null}
    </fieldset>
  );
}
