"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FormError, SubmitButton } from "@shared/ui";

import { useLoginMutation } from "../model/use-login-mutation";

export function LoginForm() {
  return (
    <Suspense fallback={<p role="status">Загружаем вход…</p>}>
      <TelegramLoginForm />
    </Suspense>
  );
}

function TelegramLoginForm() {
  const { mutate, isPending, isSuccess, error } = useLoginMutation();
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const callbackError = params?.has("telegram_error") && !dismissed;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setDismissed(true);
        mutate();
      }}
      className="flex flex-col gap-5"
    >
      <p className="text-sm text-foreground/70">
        Войдите через Telegram. При первом входе аккаунт создастся
        автоматически. Имя можно изменить в профиле.
      </p>
      <p className="text-sm text-foreground/70">
        Telegram также предложит разрешить боту отправлять уведомления о
        предстоящих событиях. Это разрешение необязательно для входа.
      </p>
      {error || callbackError ? (
        <FormError>
          Не удалось войти через Telegram. Попробуйте ещё раз. Если ошибка
          повторяется, обратитесь к администратору сайта.
        </FormError>
      ) : null}
      <SubmitButton
        pending={isPending || isSuccess}
        pendingLabel="Переходим в Telegram…"
      >
        Продолжить через Telegram
      </SubmitButton>
    </form>
  );
}
