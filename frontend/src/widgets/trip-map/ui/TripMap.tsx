import type { Event } from "@entities/event";
import { type Place, PlaceMap, type PlaceMapRoute } from "@entities/place";

interface TripMapProps {
  places: Place[];
  events?: Event[];
  numbers?: Map<number, number>;
  selectedPlaceId?: number | null;
  className?: string;
}

const DASH: Record<string, number[] | undefined> = {
  plane: [6, 10],
  walk: [1, 8],
  train: [10, 6],
  other: [14, 8],
};

export function TripMap({
  places,
  events,
  numbers,
  selectedPlaceId,
  className,
}: TripMapProps) {
  const routes: PlaceMapRoute[] =
    events?.flatMap((event) =>
      event.type === "movement"
        ? [
            {
              id: event.id,
              from: [event.fromPlace.longitude, event.fromPlace.latitude],
              to: [event.toPlace.longitude, event.toPlace.latitude],
              dash: DASH[event.transportType],
            },
          ]
        : [],
    ) ?? [];

  return (
    <section
      className={`relative flex min-w-0 flex-col ${className ?? "gap-3"}`}
      aria-label="Места на карте"
    >
      <PlaceMap
        places={places}
        numbers={numbers}
        selectedPlaceId={selectedPlaceId}
        routes={routes}
        className={
          className
            ? "h-full w-full overflow-hidden"
            : "h-80 w-full overflow-hidden rounded-large sm:h-96"
        }
      />
      {!places.length ? (
        <p className="absolute bottom-4 left-4 rounded-small bg-surface-bright px-3 py-2 text-sm font-semibold shadow-lg">
          Здесь появятся места поездки. Добавьте первое место.
        </p>
      ) : null}
    </section>
  );
}
