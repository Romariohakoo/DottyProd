"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { createEvent } from "../api/create-event";
import type { CreateEventDto } from "../api/create-event.dto";

export function useCreateEventMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventDto) => createEvent(tripId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
