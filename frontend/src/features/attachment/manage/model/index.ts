"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripQueryKeys } from "@shared/api";

import { deleteAttachment, uploadAttachment } from "../api";

export function useUploadAttachmentMutation(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, file }: { eventId: number; file: File }) =>
      uploadAttachment(tripId, eventId, file),
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
