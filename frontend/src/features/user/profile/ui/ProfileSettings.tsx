"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { type User, userQueryKeys } from "@entities/user";
import { uploadMedia } from "@shared/api";
import { mediaUrl } from "@shared/lib";
import { Button, FormError, Icon, type IconName } from "@shared/ui";

import {
  startTelegramLink,
  updateCredentials,
  updateProfile,
} from "../api/profile";

interface ProfileSettingsProps {
  user: User;
}

function Card({
  icon,
  tone,
  title,
  children,
}: {
  icon: IconName;
  tone: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="m3-settings-card" aria-label={title}>
      <header>
        <span className="m3-tone-tile size-10" data-tone={tone}>
          <Icon name={icon} size={18} />
        </span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const refresh = (data: User) =>
    queryClient.setQueryData(userQueryKeys.me, data);

  const profile = useMutation({
    mutationFn: updateProfile,
    onSuccess: refresh,
  });
  const avatar = useMutation({
    mutationFn: async (file: File) =>
      updateProfile({ avatarUrl: await uploadMedia(file) }),
    onSuccess: refresh,
  });
  const credentials = useMutation({
    mutationFn: updateCredentials,
    onSuccess: (data) => {
      refresh(data);
      setPassword("");
    },
  });
  const telegram = useMutation({
    mutationFn: startTelegramLink,
    onSuccess: ({ authorizationUrl }) => {
      window.location.href = authorizationUrl;
    },
  });

  const avatarSrc = mediaUrl(user.avatarUrl ?? null);
  const initials = (user.name || user.username).slice(0, 1).toUpperCase();
  const credentialsConflict =
    isAxiosError(credentials.error) &&
    credentials.error.response?.status === 409;

  return (
    <div className="m3-settings">
      <Card icon="user" tone="lavender" title="Профиль">
        <div className="flex items-center gap-4">
          <label className="m3-avatar-edit" aria-busy={avatar.isPending}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Сменить аватар"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) avatar.mutate(file);
                event.target.value = "";
              }}
            />
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" />
            ) : (
              <span>{initials}</span>
            )}
            <span className="m3-avatar-badge">
              {avatar.isPending ? (
                <span className="m3-spinner m3-spinner--sm" />
              ) : (
                <Icon name="camera" size={14} />
              )}
            </span>
          </label>
          <form
            className="flex min-w-0 flex-1 items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              profile.mutate({ name: name.trim() || null });
            }}
          >
            <label className="m3-settings-field flex-1">
              <span>Имя</span>
              <input
                value={name}
                maxLength={100}
                placeholder={user.username}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              variant="outlined"
              disabled={profile.isPending || name.trim() === (user.name ?? "")}
            >
              <Icon name="check" size={16} />
              Сохранить
            </Button>
          </form>
        </div>
        <p className="m3-settings-meta">
          <Icon name="at" size={14} />
          {user.username}
        </p>
        {avatar.isError || profile.isError ? (
          <FormError>
            {avatar.isError
              ? "Нужна картинка JPEG или PNG до 10 МБ."
              : "Не удалось сохранить имя."}
          </FormError>
        ) : null}
      </Card>

      <Card icon="lock" tone="mint" title="Вход по почте">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            credentials.mutate({ email: email.trim(), password });
          }}
        >
          <label className="m3-settings-field">
            <span>Почта</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="m3-settings-field">
            <span>Новый пароль</span>
            <span className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                minLength={8}
                maxLength={32}
                autoComplete="new-password"
                placeholder="8–32 символа"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
                className="m3-icon-button size-8"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
              </button>
            </span>
          </label>
          {credentials.isError ? (
            <FormError>
              {credentialsConflict
                ? "Эта почта уже занята."
                : "Проверьте почту и пароль (8–32 символа)."}
            </FormError>
          ) : null}
          <Button
            type="submit"
            className="self-start"
            disabled={
              credentials.isPending || password.length < 8 || !email.trim()
            }
          >
            {credentials.isSuccess ? <Icon name="check" size={16} /> : null}
            {credentials.isPending
              ? "Сохраняем…"
              : credentials.isSuccess
                ? "Сохранено"
                : "Сохранить"}
          </Button>
        </form>
      </Card>

      <Card icon="send" tone="sky" title="Telegram">
        <div className="flex items-center justify-between gap-3">
          <span
            className="m3-chip"
            data-tone={user.telegramId ? "mint" : "slate"}
          >
            <Icon name={user.telegramId ? "check" : "link"} size={14} />
            {user.telegramId ? "Подключён" : "Не подключён"}
          </span>
          <Button
            variant={user.telegramId ? "outlined" : "filled"}
            disabled={telegram.isPending}
            onClick={() => telegram.mutate()}
            className="m3-telegram-button"
          >
            <Icon name="send" size={16} />
            {user.telegramId ? "Переподключить" : "Подключить"}
          </Button>
        </div>
        {telegram.isError ? (
          <FormError>Не удалось открыть Telegram.</FormError>
        ) : null}
      </Card>
    </div>
  );
}
