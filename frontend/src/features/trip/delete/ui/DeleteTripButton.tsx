"use client";

import { useState } from "react";

import { Button, FormError } from "@shared/ui";

import { useDeleteTripMutation } from "../model";

interface DeleteTripButtonProps {
  tripId: number;
  onSuccess?: () => void;
}

export function DeleteTripButton({ tripId, onSuccess }: DeleteTripButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useDeleteTripMutation(tripId);

  return (
    <div className="m3-form rounded-large bg-surface-container-low p-6">
      {isConfirming ? (
        <>
          <p className="m3-label text-error">
            Удалить поездку со всеми её местами и событиями? Отменить удаление
            нельзя.
          </p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => mutate(undefined, { onSuccess })}
              aria-busy={isPending}
              variant="danger"
              className={isPending ? "m3-loading" : ""}
            >
              <span role={isPending ? "status" : undefined}>
                {isPending ? "Удаляем поездку…" : "Подтвердить удаление"}
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
          className="w-full sm:w-fit"
        >
          Удалить поездку
        </Button>
      )}

      {error ? (
        <FormError>Не удалось удалить поездку. Попробуйте ещё раз.</FormError>
      ) : null}
    </div>
  );
}
