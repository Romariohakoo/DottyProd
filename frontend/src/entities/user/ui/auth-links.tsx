"use client";

import { TextLink } from "@shared/ui";

import { useGetMe } from "../model";

export function AuthLinks() {
  const { data: user, isPending } = useGetMe();

  if (isPending || user) return null;

  return (
    <nav
      aria-label="Авторизация"
      className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-full bg-surface-container px-5 py-1"
    >
      <TextLink href="/login">Войти</TextLink>
      <TextLink href="/register">Зарегистрироваться</TextLink>
    </nav>
  );
}
