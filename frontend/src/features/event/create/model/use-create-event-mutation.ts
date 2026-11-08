"use client";

import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { createEvent } from "../api/create-event";
import type { CreateEventDto } from "../api/create-event.dto";

export function useCreateEventMutation(tripId: number) {
  const queryClient = useQueryClient();
  const request = useRef<{ payload: string; id: string } | null>(null);

  return useMutation({
    mutationFn: (data: CreateEventDto) => {
      const payload = JSON.stringify({ tripId, data });
      if (request.current?.payload !== payload) {
        request.current = { payload, id: crypto.randomUUID() };
      }
      return createEvent(tripId, {
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
