"use client";

import type { Place } from "../model";

interface PlaceListProps {
  places: Place[];
  onSelect: (placeId: number) => void;
}

export function PlaceList({ places, onSelect }: PlaceListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {places.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            className="w-full cursor-pointer rounded-lg border border-muted/60 bg-muted/15 px-4 py-3 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {place.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
