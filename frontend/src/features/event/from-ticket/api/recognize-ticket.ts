import api from "@shared/api";

import type { RecognizedTicket } from "../model/recognize";

interface TicketDraftDto {
  transportType: "plane" | "train" | "bus" | "other";
  fromAirport?: string | null;
  toAirport?: string | null;
  fromStation?: string | null;
  toStation?: string | null;
  fromName?: string | null;
  toName?: string | null;
  date?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  seat?: string | null;
  seatNumber?: string | null;
  flightNumber?: string | null;
  busNumber?: string | null;
  carriageNumber?: string | null;
  platformNumber?: string | null;
  otherFields?: { name: string; value: string }[] | null;
}

const clean = (value?: string | null) => value?.trim() || undefined;

export const recognizeTicketWithAi = async (
  tripId: number,
  file: File,
): Promise<RecognizedTicket & { arrival?: string }> => {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<TicketDraftDto>(
    `/trips/${tripId}/tickets/recognize`,
    body,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 },
  );

  if (data.transportType === "other") {
    return {
      status: data.otherFields?.length ? "found" : "empty",
      extra: data.otherFields
        ?.map((field) => `${field.name}: ${field.value}`)
        .join(", "),
    };
  }

  const extra =
    data.transportType === "train"
      ? [
          data.carriageNumber && `вагон ${data.carriageNumber}`,
          data.platformNumber && `платформа ${data.platformNumber}`,
        ]
      : [];

  return {
    status: "found",
    kind: data.transportType,
    number: clean(data.flightNumber ?? data.busNumber),
    from: clean(data.fromAirport ?? data.fromStation ?? data.fromName),
    to: clean(data.toAirport ?? data.toStation ?? data.toName),
    date: clean(data.date),
    departure: clean(data.departureTime),
    arrival: clean(data.arrivalTime),
    seat: clean(data.seat ?? data.seatNumber),
    extra: extra.filter(Boolean).join(", ") || undefined,
  };
};
