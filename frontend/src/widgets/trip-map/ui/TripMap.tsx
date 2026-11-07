import { type Place, PlaceMap } from "@entities/place";

interface TripMapProps {
  places: Place[];
}

export function TripMap({ places }: TripMapProps) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="Места на карте"
    >
      <h2 className="text-xl font-semibold">Места на карте</h2>
      <PlaceMap places={places} />
      {!places.length ? (
        <p className="text-sm text-foreground/70">
          Здесь появятся места поездки. Создайте первое место, указав его адрес.
        </p>
      ) : null}
    </section>
  );
}
