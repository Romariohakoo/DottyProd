"use client";

import { useState } from "react";

import { Button, FormError, Icon } from "@shared/ui";

import { useDeleteEventMutation } from "../model/use-delete-event-mutation";

interface DeleteEventButtonProps {
  tripId: number;
  eventId: number;
  onSuccess?: () => void;
}

export function DeleteEventButton({
  tripId,
  eventId,
  onSuccess,
}: DeleteEventButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useDeleteEventMutation(
    tripId,
    eventId,
  );

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant pt-4">
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-medium bg-error-container p-3 text-on-error-container">
          <p className="min-w-0 flex-1 text-sm font-semibold">
            Удалить событие вместе с фото?
          </p>
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
            aria-busy={isPending}
            onClick={() =>
              mutate(undefined, { onSuccess: () => onSuccess?.() })
            }
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
          Удалить событие
        </button>
      )}
      {error ? (
        <FormError>Не удалось удалить событие. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
