"use client";

import { useMemo } from "react";

import type { SearchResponse, YMapLocationRequest } from "ymaps3";

import { useYandexMaps } from "@shared/lib";
import { FormError } from "@shared/ui";

import type { Place } from "../model";

interface PlaceMapProps {
  places?: Place[];
  searchResult?: SearchResponse[number];
}

export function PlaceMap({ places, searchResult }: PlaceMapProps) {
  const maps = useYandexMaps();
  const location = useMemo<YMapLocationRequest>(() => {
    if (searchResult?.geometry) {
      return { center: searchResult.geometry.coordinates, zoom: 16 };
    }
    if (!places?.length) {
      return { center: [0, 0], zoom: 2 };
    }

    const longitudes = places.map((place) => place.longitude);
    const latitudes = places.map((place) => place.latitude);
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    const south = Math.min(...latitudes);
    const north = Math.max(...latitudes);

    if (west === east && south === north) {
      return { center: [west, south], zoom: 15 };
    }

    return {
      bounds: [
        [west, south],
        [east, north],
      ],
    };
  }, [places, searchResult]);

  if (maps.isPending) {
    return <p role="status">Загружаем карту…</p>;
  }
  if (maps.isError) {
    return <FormError>{maps.error.message}</FormError>;
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } =
    maps.data.components;

  return (
    <div
      role="region"
      aria-label="Карта мест"
      className="h-80 w-full overflow-hidden rounded-lg border border-muted/60 sm:h-96"
    >
      <YMap
        location={maps.data.reactify.useDefault(location, [location])}
        margin={[48, 48, 48, 48]}
      >
        <YMapDefaultSchemeLayer
          customization={[
            {
              tags: { any: ["poi", "transit"] },
              stylers: { visibility: "off" },
            },
            {
              types: "point",
              stylers: { visibility: "off" },
            },
            {
              tags: { none: ["road"] },
              elements: "label",
              stylers: { visibility: "off" },
            },
            {
              elements: "label.icon",
              stylers: { visibility: "off" },
            },
          ]}
        />
        <YMapDefaultFeaturesLayer />
        {places?.map((place) => (
          <YMapMarker
            key={place.id}
            coordinates={[place.longitude, place.latitude]}
          >
            <div
              role="img"
              aria-label={[place.name, place.address]
                .filter(Boolean)
                .join(", ")}
              title={[place.name, place.address].filter(Boolean).join(", ")}
              tabIndex={0}
              className="w-max max-w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-foreground bg-accent px-3 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="block truncate">{place.name}</span>
            </div>
          </YMapMarker>
        ))}
        {searchResult?.geometry ? (
          <YMapMarker coordinates={searchResult.geometry.coordinates}>
            <div
              role="img"
              aria-label={`Найдено: ${searchResult.properties.name}, ${searchResult.properties.description}`}
              tabIndex={0}
              className="w-max max-w-48 -translate-x-1/2 -translate-y-full rounded-lg border-2 border-accent bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="block truncate">
                {searchResult.properties.name}
              </span>
            </div>
          </YMapMarker>
        ) : null}
      </YMap>
    </div>
  );
}
