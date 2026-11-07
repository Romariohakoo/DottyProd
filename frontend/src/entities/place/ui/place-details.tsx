import type { Place } from "../model";

interface PlaceDetailsProps {
  place: Place;
}

export function PlaceDetails({ place }: PlaceDetailsProps) {
  return (
    <dl className="grid gap-2 break-words text-sm">
      <dt className="text-foreground/70">ID</dt>
      <dd>{place.id}</dd>
      <dt className="text-foreground/70">Название</dt>
      <dd>{place.name}</dd>
      <dt className="text-foreground/70">Адрес</dt>
      <dd>{place.address ?? "Не указан"}</dd>
      <dt className="text-foreground/70">Широта</dt>
      <dd>{place.latitude}</dd>
      <dt className="text-foreground/70">Долгота</dt>
      <dd>{place.longitude}</dd>
    </dl>
  );
}
