import api from "@shared/api";
import type { AttachmentDto } from "@shared/api";
import { API_BASE_URL } from "@shared/config";

export const attachmentUrl = (
  attachmentId: number,
  kind: "thumbnail" | "original",
) => `${API_BASE_URL}/api/attachments/${attachmentId}/${kind}`;

export const uploadAttachment = async (
  tripId: number,
  eventId: number,
  file: File,
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("client_request_id", crypto.randomUUID());
  return (
    await api.post<AttachmentDto>(
      `/trips/${tripId}/events/${eventId}/attachments`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;
};

export const deleteAttachment = async (
  tripId: number,
  attachmentId: number,
) => {
  await api.delete<void>(`/trips/${tripId}/attachments/${attachmentId}`);
};
