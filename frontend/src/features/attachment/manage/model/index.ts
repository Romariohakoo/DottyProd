"use client";

import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { deleteAttachment, uploadAttachment } from "../api";

export function useUploadAttachmentMutation(tripId: number) {
  const queryClient = useQueryClient();
  const requests = useRef(new WeakMap<File, Map<string, string>>());

  return useMutation({
    mutationFn: ({ eventId, file }: { eventId: number; file: File }) => {
      const scope = `${tripId}:${eventId}`;
      let pending = requests.current.get(file);
      if (!pending) {
        pending = new Map();
        requests.current.set(file, pending);
      }
      const id = pending.get(scope) ?? crypto.randomUUID();
      pending.set(scope, id);
      return uploadAttachment(tripId, eventId, file, id);
    },
    onSuccess: (_attachment, { eventId, file }) => {
      requests.current.get(file)?.delete(`${tripId}:${eventId}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}

export function useDeleteAttachmentMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: number) =>
      deleteAttachment(tripId, attachmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tripQueryKeys.detail(tripId),
      });
    },
  });
}
