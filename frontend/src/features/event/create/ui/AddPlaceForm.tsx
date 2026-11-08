"use client";

import type { Event } from "@entities/event";
import type { Place, StopValue } from "@entities/place";
import type { Trip } from "@entities/trip";

import { useCreateEventMutation } from "../model/use-create-event-mutation";
import { VisitForm } from "./VisitForm";

interface AddPlaceFormProps {
  tripId: number;
  trip: Trip;
  events: Event[];
  places: Place[];
  defaultDay?: string;
  initialPlace?: StopValue;
  onSuccess?: () => void;
}

export function AddPlaceForm({
  tripId,
  trip,
  events,
  places,
  defaultDay,
  initialPlace,
  onSuccess,
}: AddPlaceFormProps) {
  const { mutate, isPending, error } = useCreateEventMutation(tripId);

  return (
    <VisitForm
      trip={trip}
      events={events}
      places={places}
      defaultDay={defaultDay ?? trip.startDate}
      category="excursion"
      defaultMinutes={60}
      pickCategory
      initialPlace={initialPlace ? { value: initialPlace } : undefined}
      placeholder="Название места или адрес"
      pending={isPending}
      failed={Boolean(error)}
      submitLabel="Добавить в план"
      onSubmit={(data) => mutate(data, { onSuccess: () => onSuccess?.() })}
    />
  );
}
