"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { users } from "@shared/config";
import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useLoginMutation } from "../model/use-login-mutation";
import { type LoginValues, loginSchema } from "../model/validation";

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: "",
};

export function LoginForm() {
  const { mutate, isPending, error } = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: INITIAL_VALUES,
    mode: "onTouched",
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginValues) => {
    mutate({
      ...values,
      email: values.email.trim(),
    });
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label="Пароль"
        type="password"
        autoComplete="current-password"
        placeholder="Введите пароль"
        error={errors.password?.message}
        {...register("password")}
      />

      {error ? (
        <FormError>
          Не удалось войти. Проверьте email и пароль и попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Выполняем вход…">
        Войти
      </SubmitButton>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {users.map((user) => (
          <button
            key={user.username}
            type="button"
            disabled={isPending}
            onClick={() =>
              mutate({ email: user.email, password: user.password })
            }
            className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user.username}
          </button>
        ))}
      </div>
    </form>
  );
}
