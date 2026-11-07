"use client";

import { useState } from "react";

import { FormError } from "@shared/ui";

import { useDeleteTripMutation } from "../model";

interface DeleteTripButtonProps {
  tripId: number;
  onSuccess?: () => void;
}

export function DeleteTripButton({ tripId, onSuccess }: DeleteTripButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useDeleteTripMutation(tripId);

  return (
    <div className="flex flex-col gap-3">
      {isConfirming ? (
        <>
          <p className="text-sm text-foreground/80">
            Удалить поездку со всеми её местами и событиями? Отменить удаление
            нельзя.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => mutate(undefined, { onSuccess })}
              className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Удаляем поездку…" : "Подтвердить удаление"}
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
          className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Удалить поездку
        </button>
      )}

      {error ? (
        <FormError>Не удалось удалить поездку. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
