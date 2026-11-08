"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { login } from "../api/login";

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      // Recreate mounted query observers as well as clearing their cache.
      window.location.replace("/");
    },
  });
}
