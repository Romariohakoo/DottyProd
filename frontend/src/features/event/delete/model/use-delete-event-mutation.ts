"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { deleteEvent } from "../api/delete-event";

export function useDeleteEventMutation(tripId: number, eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteEvent(tripId, eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
