import api, { type TripDto } from "@shared/api";

import type { CreateTripDto } from "./create-trip.dto";

export const createTrip = async (data: CreateTripDto) =>
  (await api.post<TripDto>("/trips", data)).data;
