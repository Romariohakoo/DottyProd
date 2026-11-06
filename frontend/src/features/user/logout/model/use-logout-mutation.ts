"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userQueryKeys } from "@entities/user";
import { clearAccessToken } from "@shared/api";

import { logout } from "../api";

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken();
      queryClient.setQueryData(userQueryKeys.me, null);
    },
  });
}
