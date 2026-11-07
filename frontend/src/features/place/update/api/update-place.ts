import type { PlaceDto } from "@entities/place";
import api from "@shared/api";

import type { UpdatePlaceDto } from "./update-place.dto";

export const updatePlace = async (
  tripId: number,
  placeId: number,
  data: UpdatePlaceDto,
) => (await api.put<PlaceDto>(`/trips/${tripId}/places/${placeId}`, data)).data;
