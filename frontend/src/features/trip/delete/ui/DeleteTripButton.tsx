"use client";

import { useState } from "react";

import { Button, FormError, Icon } from "@shared/ui";

import { useDeleteTripMutation } from "../model";

interface DeleteTripButtonProps {
  tripId: number;
  onSuccess?: () => void;
}

export function DeleteTripButton({ tripId, onSuccess }: DeleteTripButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useDeleteTripMutation(tripId);

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant pt-4">
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-medium bg-error-container p-3 text-on-error-container">
          <p className="min-w-0 flex-1 text-sm font-semibold">
            Удалить поездку со всеми местами, событиями и фото? Вернуть её будет
            нельзя.
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
          Удалить поездку
        </button>
      )}

      {error ? (
        <FormError>Не удалось удалить поездку. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
