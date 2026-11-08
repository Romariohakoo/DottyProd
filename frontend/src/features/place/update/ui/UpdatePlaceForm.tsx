"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { type Place, PlaceCombobox } from "@entities/place";
import { Button, FormError, Icon } from "@shared/ui";

import { useUpdatePlaceMutation } from "../model/use-update-place-mutation";
import { type UpdatePlaceValues, updatePlaceSchema } from "../model/validation";

interface UpdatePlaceFormProps {
  tripId: number;
  place: Place;
  onSuccess?: () => void;
}

export function UpdatePlaceForm({
  tripId,
  place,
  onSuccess,
}: UpdatePlaceFormProps) {
  const { mutate, isPending, error } = useUpdatePlaceMutation(tripId, place.id);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid, isDirty },
  } = useForm<UpdatePlaceValues>({
    defaultValues: {
      name: place.name,
      address: place.address ?? "",
      latitude: place.latitude,
      longitude: place.longitude,
    },
    mode: "onChange",
    resolver: zodResolver(updatePlaceSchema),
  });

  const [latitude, longitude] = useWatch({
    control,
    name: ["latitude", "longitude"],
  });

  const onSubmit = (values: UpdatePlaceValues) => {
    if (!isValid || !isDirty || isPending) return;
    mutate(
      {
        name: values.name.trim(),
        address: values.address.trim() || null,
        latitude: values.latitude,
        longitude: values.longitude,
      },
      { onSuccess },
    );
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <fieldset disabled={isPending} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xlarge border border-outline-variant bg-surface-bright p-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-large bg-primary-container text-primary">
            <Icon name="pin" size={22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <input
              type="text"
              maxLength={200}
              aria-label="Название места"
              aria-invalid={Boolean(errors.name)}
              placeholder="Название"
              className="-mx-1.5 min-w-0 rounded-small bg-transparent px-1.5 py-0.5 text-lg font-extrabold outline-none hover:bg-surface-container-low focus:bg-surface-container-low"
              {...register("name")}
            />
            <input
              type="text"
              maxLength={1000}
              aria-label="Адрес"
              placeholder="Адрес"
              className="-mx-1.5 min-w-0 rounded-small bg-transparent px-1.5 py-0.5 text-sm text-on-surface-variant outline-none hover:bg-surface-container-low focus:bg-surface-container-low"
              {...register("address")}
            />
          </span>
        </div>
        <div className="flex flex-wrap">
          <PlaceCombobox
            large
            places={[]}
            value={null}
            onChange={(value) => {
              if (value?.kind !== "new") return;
              const options = { shouldDirty: true, shouldValidate: true };
              setValue(
                "address",
                value.place.address
                  ? `${value.place.name}, ${value.place.address}`.slice(0, 1000)
                  : value.place.name,
                options,
              );
              setValue("latitude", value.place.latitude, options);
              setValue("longitude", value.place.longitude, options);
            }}
            placeholder="Уточнить точку на карте"
          />
        </div>
        {latitude !== place.latitude || longitude !== place.longitude ? (
          <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <Icon name="check" size={15} />
            Точка обновлена
          </p>
        ) : null}
        {errors.name ? (
          <FormError>{errors.name.message ?? "Введите название"}</FormError>
        ) : null}
      </fieldset>

      {error ? (
        <FormError>
          Не удалось сохранить место. Проверьте данные и попробуйте ещё раз.
        </FormError>
      ) : null}

      <Button
        type="submit"
        disabled={!isValid || !isDirty || isPending}
        aria-busy={isPending}
        className="w-full"
      >
        <span role={isPending ? "status" : undefined}>
          {isPending ? "Сохраняем…" : "Сохранить"}
        </span>
      </Button>
    </form>
  );
}
