"use client";

import { useGetMe } from "../model";

export function UserBadge() {
  const { data: user, isPending, isError } = useGetMe();

  if (isPending || isError || !user) return null;

  return (
    <span
      aria-label={`Пользователь: ${user.username}`}
      className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-sm font-medium text-foreground"
    >
      {user.username}
    </span>
  );
}
