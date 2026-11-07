"use client";

import type { Event } from "../model";

interface EventListProps {
  events: Event[];
  onSelect: (eventId: number) => void;
}

export function EventList({ events, onSelect }: EventListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => onSelect(event.id)}
            className="w-full cursor-pointer rounded-lg border border-muted/60 bg-muted/15 px-4 py-3 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {event.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
