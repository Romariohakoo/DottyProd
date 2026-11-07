"use client";

import { useState } from "react";

import { FormError } from "@shared/ui";

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
    <div className="flex flex-col gap-3 border-t border-muted/60 pt-5">
      {isConfirming ? (
        <>
          <p className="text-sm text-foreground/80">
            Удалить событие? Это действие нельзя отменить. Места поездки
            сохранятся.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                mutate(undefined, { onSuccess: () => onSuccess?.() })
              }
              className="cursor-pointer rounded-lg bg-accent px-4 py-3 text-sm font-semibold transition-colors enabled:hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
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
              className="cursor-pointer rounded-lg border border-muted/60 px-4 py-3 text-sm transition-colors enabled:hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="cursor-pointer rounded-lg border border-muted/60 px-4 py-3 text-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Удалить событие
        </button>
      )}
      {error ? (
        <FormError>Не удалось удалить событие. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
