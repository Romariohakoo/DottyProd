'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  FormError,
  FormField,
  SubmitButton,
  TextLink,
} from '@shared/ui';

import { useRegisterMutation } from '../model/use-register-mutation';
import {
  type RegisterValues,
  registerSchema,
} from '../model/validation';

const INITIAL_VALUES: RegisterValues = {
  name: '',
  login: '',
  password: '',
};

export function RegisterForm() {
  const { mutate, isPending, error } =
    useRegisterMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (values: RegisterValues) => {
    mutate({
      ...values,
      name: values.name.trim(),
      login: values.login.trim(),
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
        label="Имя"
        type="text"
        autoComplete="name"
        placeholder="Введите имя"
        error={errors.name?.message}
        {...register('name')}
      />
      <FormField
        label="Логин"
        type="text"
        autoComplete="username"
        placeholder="Введите логин"
        error={errors.login?.message}
        {...register('login')}
      />
      <FormField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        placeholder="Введите пароль"
        error={errors.password?.message}
        {...register('password')}
      />

      {error ? (
        <FormError>
          Не удалось создать аккаунт. Проверьте данные и
          попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton
        pending={isPending}
        pendingLabel="Создаём аккаунт…"
      >
        Создать аккаунт
      </SubmitButton>

      <p className="mt-2 text-sm text-ink/70">
        Уже есть аккаунт?{' '}
        <TextLink href="/login">Войти</TextLink>
      </p>
    </form>
  );
}
