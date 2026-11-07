import api, { getTripDetail } from "@shared/api";
import type { TripCardDto } from "@shared/api";

export const getTrips = async () =>
  (await api.get<TripCardDto[]>("/trips")).data;

export const getTrip = getTripDetail;
