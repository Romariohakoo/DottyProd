import api from "@shared/api";

export const deleteEvent = async (tripId: number, eventId: number) => {
  await api.delete<void>(`/trips/${tripId}/events/${eventId}`);
};
