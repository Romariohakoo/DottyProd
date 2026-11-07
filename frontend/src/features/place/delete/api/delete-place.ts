import api from "@shared/api";

export const deletePlace = async (tripId: number, placeId: number) => {
  await api.delete(`/trips/${tripId}/places/${placeId}`);
};
