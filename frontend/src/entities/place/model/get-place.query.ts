import { useQuery } from "@tanstack/react-query";

import { tripDetailQueryOptions } from "@shared/api";

export const usePlacesQuery = (tripId: number) =>
  useQuery({
    ...tripDetailQueryOptions(tripId),
    select: (detail) => detail.places,
  });

export const usePlaceQuery = (tripId: number, placeId: number) =>
  useQuery({
    ...tripDetailQueryOptions(tripId),
    select: (detail) => detail.places.find((place) => place.id === placeId),
  });
