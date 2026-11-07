"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { User } from "@entities/user";
import { FormError, FormField, StatusMessage, SubmitButton } from "@shared/ui";

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
      className="m3-form"
      noValidate
    >
      <div className="m3-form-section">
        <FormField
          label="Имя"
          type="text"
          autoComplete="name"
          placeholder="Введите имя"
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      {error ? (
        <FormError>
          Не удалось сохранить изменения. Попробуйте ещё раз.
        </FormError>
      ) : null}

      {isSuccess ? <StatusMessage>Изменения сохранены</StatusMessage> : null}

      <SubmitButton pending={isPending} pendingLabel="Сохраняем…">
        Сохранить
      </SubmitButton>
    </form>
  );
}
