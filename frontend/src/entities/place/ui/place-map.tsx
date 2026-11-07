"use client";

import { useMemo } from "react";

import type { SearchResponse, YMapLocationRequest } from "ymaps3";

import { useYandexMaps } from "@shared/lib";
import { FormError } from "@shared/ui";

import type { Place } from "../model";

export interface PlaceMapRoute {
  id: number;
  from: [number, number];
  to: [number, number];
  dash?: number[];
}

interface PlaceMapProps {
  places?: Place[];
  searchResult?: SearchResponse[number];
  numbers?: Map<number, number>;
  selectedPlaceId?: number | null;
  routes?: PlaceMapRoute[];
  className?: string;
}

export function PlaceMap({
  places,
  searchResult,
  numbers,
  selectedPlaceId,
  routes,
  className = "h-80 w-full overflow-hidden rounded-lg border border-muted/60 sm:h-96",
}: PlaceMapProps) {
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

  const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapMarker,
    YMapFeature,
  } = maps.data.components;

  return (
    <div role="region" aria-label="Карта мест" className={className}>
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
        {routes?.map((route) => (
          <YMapFeature
            key={route.id}
            geometry={{
              type: "LineString",
              coordinates: [route.from, route.to],
            }}
            style={{
              stroke: [
                {
                  color: "#5f59ff",
                  width: 4,
                  opacity: 0.75,
                  dash: route.dash,
                },
              ],
            }}
          />
        ))}
        {places?.map((place) => {
          const number = numbers?.get(place.id);
          const selected = place.id === selectedPlaceId;
          const label = [place.name, place.address].filter(Boolean).join(", ");
          return (
            <YMapMarker
              key={place.id}
              coordinates={[place.longitude, place.latitude]}
              zIndex={selected ? 10 : 1}
            >
              <div
                role="img"
                aria-label={label}
                title={label}
                tabIndex={0}
                className="flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
              >
                <span
                  className={`m3-dot grid place-items-center rounded-full border-[3px] border-surface-bright font-extrabold shadow-lg ${
                    selected
                      ? "size-10 bg-primary text-on-primary ring-8 ring-primary/20"
                      : "size-8 bg-on-surface text-sm text-surface-bright"
                  }`}
                >
                  {number ?? "•"}
                </span>
                {selected || !numbers ? (
                  <span className="max-w-48 truncate rounded-small bg-surface-bright px-3 py-1.5 text-sm font-extrabold text-on-surface shadow-lg">
                    {place.name}
                  </span>
                ) : null}
              </div>
            </YMapMarker>
          );
        })}
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
