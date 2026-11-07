"use client";

import { Button } from "@shared/ui";

import type { Place } from "../model";

interface PlaceListProps {
  places: Place[];
  onSelect: (placeId: number) => void;
}

export function PlaceList({ places, onSelect }: PlaceListProps) {
  return (
    <ul className="m3-card-list">
      {places.map((place) => (
        <li key={place.id} className="min-w-0">
          <Button
            type="button"
            onClick={() => onSelect(place.id)}
            variant="card"
          >
            <span className="m3-card-content">
              <span className="m3-badge bg-surface-bright text-primary">
                Место
              </span>
              <span>{place.name}</span>
              <span className="m3-card-meta">
                {place.address ?? "Адрес не указан"}
              </span>
              <span className="m3-card-meta">
                {place.latitude}, {place.longitude}
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
