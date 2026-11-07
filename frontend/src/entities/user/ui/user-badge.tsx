"use client";

import { useGetMe } from "../model";

export function UserBadge() {
  const { data: user, isPending, isError } = useGetMe();

  if (isPending || isError || !user) return null;

  return (
    <span
      aria-label={`Пользователь: ${user.username}`}
      className="m3-badge max-w-full"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-bold text-on-primary-container"
      >
        {user.username.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 break-words">{user.username}</span>
    </span>
  );
}
