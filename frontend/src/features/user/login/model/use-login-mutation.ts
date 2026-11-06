"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userQueryKeys } from "@entities/user";

import { login } from "../api/login";

export function useLoginMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.me,
      });
      router.replace("/");
    },
  });
}
