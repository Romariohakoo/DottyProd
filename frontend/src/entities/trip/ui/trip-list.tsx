"use client";

import { formatDate } from "@shared/lib";
import { Button } from "@shared/ui";

import type { TripCard } from "../model";

interface TripListProps {
  trips: TripCard[];
  onSelect: (tripId: number) => void;
}

export function TripList({ trips, onSelect }: TripListProps) {
  return (
    <ul className="m3-card-list">
      {trips.map((trip) => (
        <li key={trip.id} className="min-w-0">
          <Button
            type="button"
            onClick={() => onSelect(trip.id)}
            variant="card"
          >
            <span className="m3-card-content self-stretch">
              <span className="m3-card-meta">{trip.country}</span>
              <span className="m3-title">{trip.title}</span>
              <span className="m3-card-meta mt-auto">
                <time dateTime={trip.startDate}>
                  {formatDate(trip.startDate)}
                </time>
                {" — "}
                <time dateTime={trip.endDate}>{formatDate(trip.endDate)}</time>
              </span>
              <span className="m3-card-meta">Роль: {trip.role}</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
