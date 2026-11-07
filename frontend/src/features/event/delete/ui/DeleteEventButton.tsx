"use client";

import { useState } from "react";

import { Button, FormError } from "@shared/ui";

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
    <div className="m3-group border-error-container">
      {isConfirming ? (
        <>
          <p className="m3-support text-on-surface">
            Удалить событие? Это действие нельзя отменить. Места поездки
            сохранятся.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              disabled={isPending}
              aria-busy={isPending}
              onClick={() =>
                mutate(undefined, { onSuccess: () => onSuccess?.() })
              }
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
          Удалить событие
        </Button>
      )}
      {error ? (
        <FormError>Не удалось удалить событие. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
