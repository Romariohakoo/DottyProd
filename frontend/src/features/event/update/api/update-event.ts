import api from "@shared/api";
import type { EventDto } from "@shared/api";

import type { UpdateEventDto } from "./update-event.dto";

export const updateEvent = async (
  tripId: number,
  eventId: number,
  data: UpdateEventDto,
) => (await api.put<EventDto>(`/trips/${tripId}/events/${eventId}`, data)).data;
