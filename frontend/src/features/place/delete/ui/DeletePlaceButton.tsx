"use client";

import { useState } from "react";

import { isAxiosError } from "axios";

import { Button, FormError } from "@shared/ui";

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
    <div className="m3-group border-error-container" aria-busy={isPending}>
      {isConfirming ? (
        <>
          <p className="m3-support text-on-surface">
            Удалить место? Это действие нельзя отменить.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => mutate(undefined, { onSuccess })}
              variant="danger"
            >
              <span role={isPending ? "status" : undefined}>
                {isPending ? "Удаляем…" : "Подтвердить удаление"}
              </span>
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsConfirming(false);
                reset();
              }}
              variant="outlined"
            >
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          onClick={() => setIsConfirming(true)}
          variant="danger"
        >
          Удалить место
        </Button>
      )}

      {error ? (
        <FormError>
          {isPlaceInUse
            ? "Нельзя удалить место: оно используется событием. Сначала измените или удалите связанные события."
            : isConflict
              ? "Место было изменено другим запросом. Попробуйте удалить его ещё раз."
              : "Не удалось удалить место. Попробуйте ещё раз."}
        </FormError>
      ) : null}
    </div>
  );
}
