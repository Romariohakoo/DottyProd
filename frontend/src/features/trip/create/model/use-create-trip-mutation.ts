"use client";

import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { createTrip } from "../api/create-trip";
import type { CreateTripDto } from "../api/create-trip.dto";

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  const request = useRef<{ payload: string; id: string } | null>(null);

  return useMutation({
    mutationFn: (data: CreateTripDto) => {
      const payload = JSON.stringify(data);
      if (request.current?.payload !== payload) {
        request.current = { payload, id: crypto.randomUUID() };
      }
      return createTrip({
        ...data,
        clientRequestId: data.clientRequestId ?? request.current.id,
      });
    },
    onSuccess: () => {
      request.current = null;
      void queryClient.invalidateQueries({ queryKey: tripQueryKeys.list });
    },
  });
}
