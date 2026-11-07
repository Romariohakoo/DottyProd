"use client";

import { useGetMe } from "@entities/user";
import { Button } from "@shared/ui";

import { useLogoutMutation } from "../model";

export function LogoutButton() {
  const { data: user } = useGetMe();
  const { mutate, isPending } = useLogoutMutation();

  if (!user) return null;

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => mutate()}
      variant="text"
      aria-busy={isPending}
    >
      {isPending ? "Выходим…" : "Выйти"}
    </Button>
  );
}
