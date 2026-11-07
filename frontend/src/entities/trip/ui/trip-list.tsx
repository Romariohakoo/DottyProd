"use client";

import type { TripCard } from "../model";

interface TripListProps {
  trips: TripCard[];
  onSelect: (tripId: number) => void;
}

export function TripList({ trips, onSelect }: TripListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {trips.map((trip) => (
        <li key={trip.id}>
          <button
            type="button"
            onClick={() => onSelect(trip.id)}
            className="w-full cursor-pointer rounded-lg border border-muted/60 bg-muted/15 px-4 py-3 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {trip.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
