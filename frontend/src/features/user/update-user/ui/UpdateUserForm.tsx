"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { User } from "@entities/user";
import { FormError, FormField, SubmitButton } from "@shared/ui";

import { useUpdateUserMutation } from "../model/use-update-user-mutation";
import { type UpdateUserValues, updateUserSchema } from "../model/validation";

interface UpdateUserFormProps {
  user: User;
}

export function UpdateUserForm({ user }: UpdateUserFormProps) {
  const { mutate, isPending, isSuccess, error } = useUpdateUserMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserValues>({
    defaultValues: { name: user.username },
    mode: "onTouched",
    resolver: zodResolver(updateUserSchema),
  });

  const onSubmit = (values: UpdateUserValues) => {
    mutate({ name: values.name.trim() });
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
        label="Имя"
        type="text"
        autoComplete="name"
        placeholder="Введите имя"
        error={errors.name?.message}
        {...register("name")}
      />

      {error ? (
        <FormError>
          Не удалось сохранить изменения. Попробуйте ещё раз.
        </FormError>
      ) : null}

      {isSuccess ? (
        <p role="status" className="text-sm text-foreground/70">
          Изменения сохранены
        </p>
      ) : null}

      <SubmitButton pending={isPending} pendingLabel="Сохраняем…">
        Сохранить
      </SubmitButton>
    </form>
  );
}
