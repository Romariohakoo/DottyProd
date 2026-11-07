import { useQuery } from "@tanstack/react-query";

import { tripDetailQueryOptions } from "@shared/api";

export const useEventsQuery = (tripId: number) =>
  useQuery({
    ...tripDetailQueryOptions(tripId),
    select: (detail) => detail.timeline,
  });

export const useEventQuery = (tripId: number, eventId: number) =>
  useQuery({
    ...tripDetailQueryOptions(tripId),
    select: (detail) => detail.timeline.find((event) => event.id === eventId),
  });
