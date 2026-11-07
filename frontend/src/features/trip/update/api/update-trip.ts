import api, { type TripDto } from "@shared/api";

import type { UpdateTripDto } from "./update-trip.dto";

export const updateTrip = async (tripId: number, data: UpdateTripDto) =>
  (await api.put<TripDto>(`/trips/${tripId}`, data)).data;
