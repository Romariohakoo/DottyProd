"use client";

import Link from "next/link";

import { useGetMe } from "../model";

export function AuthLinks() {
  const { data: user, isPending } = useGetMe();

  if (isPending || user) return null;

  return (
    <nav aria-label="Авторизация" className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Войти
      </Link>
      <Link
        href="/register"
        className="text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Зарегистрироваться
      </Link>
    </nav>
  );
}
