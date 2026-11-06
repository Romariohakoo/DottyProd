'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  FormError,
  FormField,
  SubmitButton,
  TextLink,
} from '@shared/ui';

import { useLoginMutation } from '../model/use-login-mutation';
import {
  type LoginValues,
  loginSchema,
} from '../model/validation';

const INITIAL_VALUES: LoginValues = {
  login: '',
  password: '',
};

export function LoginForm() {
  const { mutate, isPending, error } = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: INITIAL_VALUES,
    mode: 'onTouched',
    resolver: zodResolver(loginSchema),
  });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit((values) => mutate(values))(
          event,
        );
      }}
      className="flex flex-col gap-5"
      noValidate
    >
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
        autoComplete="current-password"
        placeholder="Введите пароль"
        error={errors.password?.message}
        {...register('password')}
      />

      {error ? (
        <FormError>
          Не удалось войти. Проверьте логин и пароль и
          попробуйте ещё раз.
        </FormError>
      ) : null}

      <SubmitButton
        pending={isPending}
        pendingLabel="Выполняем вход…"
      >
        Войти
      </SubmitButton>

      <p className="mt-2 text-sm text-ink/70">
        Нет аккаунта?{' '}
        <TextLink href="/register">Создать</TextLink>
      </p>
    </form>
  );
}
