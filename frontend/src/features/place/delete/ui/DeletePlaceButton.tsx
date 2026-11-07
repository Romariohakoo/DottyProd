"use client";

import { useState } from "react";

import { isAxiosError } from "axios";

import { FormError } from "@shared/ui";

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
    <div className="flex flex-col gap-3" aria-busy={isPending}>
      {isConfirming ? (
        <>
          <p className="text-sm text-foreground/80">
            Удалить место? Это действие нельзя отменить.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => mutate(undefined, { onSuccess })}
              className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Удаляем…" : "Подтвердить удаление"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsConfirming(false);
                reset();
              }}
              className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Удалить место
        </button>
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
