"use client";

import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { createPlace } from "../api/create-place";
import type { CreatePlaceDto } from "../api/create-place.dto";

export function useCreatePlaceMutation(tripId: number) {
  const queryClient = useQueryClient();
  const request = useRef<{ payload: string; id: string } | null>(null);

  return useMutation({
    mutationFn: (data: CreatePlaceDto) => {
      const payload = JSON.stringify({ tripId, data });
      if (request.current?.payload !== payload) {
        request.current = { payload, id: crypto.randomUUID() };
      }
      return createPlace(tripId, {
        ...data,
        clientRequestId: data.clientRequestId ?? request.current.id,
      });
    },
    onSuccess: () => {
      request.current = null;
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
