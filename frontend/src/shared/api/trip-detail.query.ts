import { queryOptions } from "@tanstack/react-query";

import api from "./client";
import type { TripDetailDto } from "./travelhub.dto";

export const tripQueryKeys = {
  base: ["trips"],
  list: ["trips", "list"],
  detail: (tripId: number) => ["trips", "detail", tripId],
};

export const getTripDetail = async (tripId: number) =>
  (await api.get<TripDetailDto>(`/trips/${tripId}`)).data;

export const tripDetailQueryOptions = (tripId: number) =>
  queryOptions({
    queryKey: tripQueryKeys.detail(tripId),
    queryFn: () => getTripDetail(tripId),
    enabled: Number.isInteger(tripId) && tripId > 0,
    staleTime: Infinity,
  });
