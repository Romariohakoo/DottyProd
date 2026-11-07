"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { updateEvent } from "../api/update-event";
import type { UpdateEventDto } from "../api/update-event.dto";

export function useUpdateEventMutation(tripId: number, eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEventDto) => updateEvent(tripId, eventId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
