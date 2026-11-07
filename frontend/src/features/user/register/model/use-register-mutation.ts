"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userQueryKeys } from "@entities/user";

import { register } from "../api/register";
import type { RegisterDto } from "../api/register.dto";

export function useRegisterMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterDto) => register(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.me,
      });
      router.replace("/login");
    },
  });
}
