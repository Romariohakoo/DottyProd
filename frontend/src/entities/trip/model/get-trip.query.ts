import { useQuery } from "@tanstack/react-query";

import { tripDetailQueryOptions } from "@shared/api";

import { getTrips, tripQueryKeys } from "../api";

export const useTripsQuery = () =>
  useQuery({ queryKey: tripQueryKeys.list, queryFn: getTrips });

export const useTripQuery = (tripId: number) =>
  useQuery(tripDetailQueryOptions(tripId));
