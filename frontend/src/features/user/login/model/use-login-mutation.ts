"use client";

import { useMutation } from "@tanstack/react-query";

import { clearAccessToken } from "@shared/api";

import { login } from "../api/login";

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    onSuccess: ({ authorizationUrl }) => {
      clearAccessToken();
      window.location.assign(authorizationUrl);
    },
  });
}
