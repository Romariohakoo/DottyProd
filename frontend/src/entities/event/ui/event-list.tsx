"use client";

import { Button, DateTimeText } from "@shared/ui";

import type { Event } from "../model";

interface EventListProps {
  events: Event[];
  onSelect: (eventId: number) => void;
}

export function EventList({ events, onSelect }: EventListProps) {
  return (
    <ul className="m3-card-list">
      {events.map((event) => (
        <li key={event.id} className="min-w-0">
          <Button
            type="button"
            onClick={() => onSelect(event.id)}
            variant="card"
          >
            <span className="m3-card-content">
              <span className="m3-badge bg-surface-bright text-primary">
                {event.type === "activity" ? "Активность" : "Перемещение"}
              </span>
              <span>{event.title}</span>
              <span className="m3-card-meta">
                <DateTimeText value={event.startAt} />
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
