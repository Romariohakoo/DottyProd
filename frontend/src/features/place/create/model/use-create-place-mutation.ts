"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { createPlace } from "../api/create-place";
import type { CreatePlaceDto } from "../api/create-place.dto";

export function useCreatePlaceMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlaceDto) => createPlace(tripId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
