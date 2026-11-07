"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { updateTrip } from "../api/update-trip";
import type { UpdateTripDto } from "../api/update-trip.dto";

export function useUpdateTripMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTripDto) => updateTrip(tripId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripQueryKeys.list });
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
