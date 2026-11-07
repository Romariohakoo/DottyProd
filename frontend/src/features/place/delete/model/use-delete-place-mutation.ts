"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { deletePlace } from "../api";

export function useDeletePlaceMutation(tripId: number, placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deletePlace(tripId, placeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
