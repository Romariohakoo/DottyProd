import api from "@shared/api";

export const deleteTrip = async (tripId: number) => {
  await api.delete(`/trips/${tripId}`);
};
