"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { updatePlace } from "../api/update-place";
import type { UpdatePlaceDto } from "../api/update-place.dto";

export function useUpdatePlaceMutation(tripId: number, placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePlaceDto) => updatePlace(tripId, placeId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
