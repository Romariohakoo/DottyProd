"use client";

import Link from "next/link";

import { mediaUrl } from "@shared/lib";

import { useGetMe } from "../model";

export function UserBadge() {
  const { data: user, isPending, isError } = useGetMe();

  if (isPending || isError || !user) return null;

  const name = user.name || user.username;
  const avatar = mediaUrl(user.avatarUrl ?? null);

  return (
    <Link
      href="/profile"
      aria-label={`Личный кабинет: ${name}`}
      className="m3-badge m3-user-link max-w-full"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container font-bold text-on-primary-container"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="min-w-0 break-words">{name}</span>
    </Link>
  );
}
