"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";

import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useRegisterMutation } from "../model/use-register-mutation";
import { type RegisterValues, registerSchema } from "../model/validation";

const INITIAL_VALUES: RegisterValues = {
  username: "",
  email: "",
  password: "",
};

export function RegisterForm() {
  const { mutate, isPending, error } = useRegisterMutation();
  const conflictReason =
    isAxiosError<{ reason?: string }>(error) && error.response?.status === 409
      ? error.response.data.reason
      : undefined;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    defaultValues: INITIAL_VALUES,
    mode: "onTouched",
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (values: RegisterValues) => {
    mutate({
      ...values,
      username: values.username.trim(),
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
        label="Имя пользователя"
        type="text"
        autoComplete="username"
        placeholder="Введите имя пользователя"
        error={errors.username?.message}
        {...register("username")}
      />
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
        autoComplete="new-password"
        placeholder="Введите пароль"
        error={errors.password?.message}
        {...register("password")}
      />

      {error ? (
        <FormError>
          {conflictReason === "Email already registered"
            ? "Пользователь с данным email уже зарегистрирован"
            : conflictReason === "Username already taken"
              ? "Имя пользователя уже занято"
              : "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз."}
        </FormError>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Создаём аккаунт…">
        Создать аккаунт
      </SubmitButton>
    </form>
  );
}
