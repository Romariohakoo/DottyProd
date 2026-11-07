import api from "@shared/api";
import type { EventDto } from "@shared/api";

import type { CreateEventDto } from "./create-event.dto";

export const createEvent = async (tripId: number, data: CreateEventDto) =>
  (await api.post<EventDto>(`/trips/${tripId}/events`, data)).data;
