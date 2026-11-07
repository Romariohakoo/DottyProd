"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { deleteTrip } from "../api";

export function useDeleteTripMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTrip(tripId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: tripQueryKeys.detail(tripId),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: tripQueryKeys.list });
    },
  });
}
