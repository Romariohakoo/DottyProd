"use client";

import { useGetMe } from "@entities/user";

import { useLogoutMutation } from "../model";

export function LogoutButton() {
  const { data: user } = useGetMe();
  const { mutate, isPending } = useLogoutMutation();

  if (!user) return null;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => mutate()}
      className="cursor-pointer rounded-lg border border-muted/60 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors enabled:hover:border-accent enabled:hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Выходим…" : "Выйти"}
    </button>
  );
}
