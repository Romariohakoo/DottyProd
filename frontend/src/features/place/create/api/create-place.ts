import type { PlaceDto } from "@entities/place";
import api from "@shared/api";

import type { CreatePlaceDto } from "./create-place.dto";

export const createPlace = async (tripId: number, data: CreatePlaceDto) =>
  (await api.post<PlaceDto>(`/trips/${tripId}/places`, data)).data;
