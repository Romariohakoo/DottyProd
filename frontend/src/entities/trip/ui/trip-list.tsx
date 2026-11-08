"use client";

import { formatDateTime, tripCoverUrl } from "@shared/lib";

import type { TripCard } from "../model";

interface TripListProps {
  trips: TripCard[];
  featured?: boolean;
  onSelect: (tripId: number) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function tripBadge(trip: TripCard, today: number): string {
  const start = Date.parse(trip.startDate);
  const end = Date.parse(trip.endDate);
  if (end < today) return "Завершена";
  if (start <= today) return "Сейчас в пути";
  const days = Math.ceil((start - today) / DAY_MS);
  return days === 1 ? "Завтра" : `Через ${days} дн.`;
}

export function TripList({ trips, featured = false, onSelect }: TripListProps) {
  const today = new Date().setHours(0, 0, 0, 0);

  return (
    <ul className={`m3-trip-grid ${featured ? "m3-trip-grid--featured" : ""}`}>
      {trips.map((trip) => (
        <li key={trip.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onSelect(trip.id)}
            className="m3-trip-card"
          >
            <span className="m3-trip-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tripCoverUrl(trip.coverUrl, trip)} alt="" />
              <span className="m3-trip-badge">{tripBadge(trip, today)}</span>
            </span>
            <span className="m3-trip-title">{trip.title}</span>
            <span className="m3-trip-meta">
              {trip.country} ·{" "}
              <time dateTime={trip.startDate}>
                {formatDateTime(trip.startDate, undefined, true)}
              </time>
              {" — "}
              <time dateTime={trip.endDate}>
                {formatDateTime(trip.endDate, undefined, true)}
              </time>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
