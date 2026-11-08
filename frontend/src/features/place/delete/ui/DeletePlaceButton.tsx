"use client";

import { useState } from "react";

import { isAxiosError } from "axios";

import { Button, FormError, Icon } from "@shared/ui";

import { useDeletePlaceMutation } from "../model";

interface DeletePlaceButtonProps {
  tripId: number;
  placeId: number;
  onSuccess?: () => void;
}

export function DeletePlaceButton({
  tripId,
  placeId,
  onSuccess,
}: DeletePlaceButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useDeletePlaceMutation(
    tripId,
    placeId,
  );
  const isConflict =
    isAxiosError<{ reason?: string }>(error) && error.response?.status === 409;
  const isPlaceInUse =
    isConflict && error.response?.data.reason === "Place is used by events";

  return (
    <div
      className="flex flex-col gap-3 border-t border-outline-variant pt-4"
      aria-busy={isPending}
    >
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-medium bg-error-container p-3 text-on-error-container">
          <p className="min-w-0 flex-1 text-sm font-semibold">Удалить место?</p>
          <Button
            type="button"
            variant="outlined"
            disabled={isPending}
            onClick={() => {
              setIsConfirming(false);
              reset();
            }}
            className="min-h-10 py-1"
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => mutate(undefined, { onSuccess })}
            className="min-h-10 bg-error py-1 text-on-error"
          >
            <span role={isPending ? "status" : undefined}>
              {isPending ? "Удаляем…" : "Удалить"}
            </span>
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="flex items-center gap-2 self-start text-sm font-bold text-error hover:underline"
        >
          <Icon name="trash" size={16} />
          Удалить место
        </button>
      )}

      {error ? (
        <FormError>
          {isPlaceInUse
            ? "Здесь есть события. Сначала удалите или перенесите их."
            : isConflict
              ? "Место было изменено другим запросом. Попробуйте удалить его ещё раз."
              : "Не удалось удалить место. Попробуйте ещё раз."}
        </FormError>
      ) : null}
    </div>
  );
}
