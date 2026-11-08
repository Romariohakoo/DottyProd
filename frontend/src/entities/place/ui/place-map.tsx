"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";

import type {
  LngLat,
  SearchResponse,
  YMapCenterZoomLocation,
  YMapLocationRequest,
} from "ymaps3";

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
  routeOffsets?: Map<number, [number, number]>;
  selectedRouteIds?: Set<number>;
  renderPlaceContent?: (place: Place) => ReactNode;
  onPlaceClick?: (place: Place, event: MouseEvent) => void;
  showOrganizations?: boolean;
  picking?: boolean;
  onSelectCoordinates?: (coordinates: LngLat) => void;
  onUnavailablePoi?: () => void;
  className?: string;
}

export function PlaceMap({
  places,
  searchResult,
  numbers,
  selectedPlaceId,
  routes,
  routeOffsets,
  selectedRouteIds,
  renderPlaceContent,
  onPlaceClick,
  showOrganizations = false,
  picking = false,
  onSelectCoordinates,
  onUnavailablePoi,
  className = "h-80 w-full overflow-hidden rounded-lg border border-muted/60 sm:h-96",
}: PlaceMapProps) {
  const maps = useYandexMaps();
  const [mapLocation, setMapLocation] = useState<YMapCenterZoomLocation>({
    center: [0, 0],
    zoom: 2,
  });
  const coordinatesKey =
    places?.map((place) => `${place.longitude},${place.latitude}`).join(";") ??
    "";
  const searchGeometry = searchResult?.geometry;
  const location = useMemo<YMapLocationRequest | null>(() => {
    if (searchGeometry) {
      return { center: searchGeometry.coordinates, zoom: 16 };
    }
    // An empty day has no fit target; preserve the camera reported by the map.
    if (!coordinatesKey) return null;

    const coordinates = coordinatesKey
      .split(";")
      .map((point) => point.split(",").map(Number));
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
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
  }, [coordinatesKey, searchGeometry]);

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
    YMapListener,
  } = maps.data.components;

  return (
    <div role="region" aria-label="Карта мест" className={className}>
      <YMap
        location={maps.data.reactify.useDefault(location ?? mapLocation, [
          location,
        ])}
        margin={[48, 48, 48, 48]}
      >
        <YMapDefaultSchemeLayer
          customization={
            showOrganizations
              ? []
              : [
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
                ]
          }
        />
        <YMapDefaultFeaturesLayer />
        <YMapListener
          layer="any"
          onUpdate={({ location }) => {
            setMapLocation((current) =>
              current.zoom === location.zoom &&
              current.center[0] === location.center[0] &&
              current.center[1] === location.center[1]
                ? current
                : { center: location.center, zoom: location.zoom },
            );
          }}
          onClick={(object, event) => {
            if (!picking) return;
            if (object?.type === "hotspot") {
              event.stopPropagation();
              if (event.coordinates) onSelectCoordinates?.(event.coordinates);
              else onUnavailablePoi?.();
              return;
            }
            if (object) return;
            onSelectCoordinates?.(event.coordinates);
          }}
        />
        {routes?.map((route) => {
          const curve = routeCurve(
            route,
            mapLocation.zoom,
            routeOffsets?.get(route.id),
          );
          if (!curve) return null;
          const selected = selectedRouteIds?.has(route.id) ?? false;
          return (
            <Fragment key={route.id}>
              <YMapFeature
                geometry={{
                  type: "LineString",
                  coordinates: curve.coordinates,
                }}
                style={{
                  interactive: false,
                  zIndex: selected ? 2 : 0,
                  stroke: [
                    {
                      color: "#ffffff",
                      width: selected ? 6 : 4,
                      dash: route.dash ?? [],
                    },
                    {
                      color: "#000000",
                      width: selected ? 8 : 6,
                      dash: route.dash ?? [],
                    },
                  ],
                }}
              />
              <YMapFeature
                geometry={{
                  type: "MultiLineString",
                  coordinates: curve.arrowCoordinates,
                }}
                style={{
                  interactive: false,
                  zIndex: selected ? 3 : 1,
                  stroke: [
                    {
                      color: "#ffffff",
                      width: selected ? 5 : 3,
                      dash: [],
                    },
                    {
                      color: "#000000",
                      width: selected ? 7 : 5,
                      dash: [],
                    },
                  ],
                }}
              />
            </Fragment>
          );
        })}
        {places?.map((place) => {
          const number = numbers?.get(place.id);
          const selected = place.id === selectedPlaceId;
          const label = [place.name, place.address].filter(Boolean).join(", ");
          return (
            <YMapMarker
              key={place.id}
              coordinates={[place.longitude, place.latitude]}
              zIndex={selected ? 10 : 1}
              blockBehaviors={Boolean(onPlaceClick)}
              onClick={
                onPlaceClick
                  ? (event, mapEvent) => {
                      mapEvent.stopPropagation();
                      onPlaceClick(place, event);
                    }
                  : undefined
              }
            >
              {renderPlaceContent ? (
                <div className="w-max -translate-x-6 -translate-y-full">
                  {renderPlaceContent(place)}
                </div>
              ) : (
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
              )}
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

function routeCurve(
  route: PlaceMapRoute,
  zoom: number,
  offsets: [number, number] = [0, 0],
) {
  if (![...route.from, ...route.to, ...offsets, zoom].every(Number.isFinite))
    return null;
  const project = ([longitude, latitude]: LngLat): LngLat => [
    (longitude * Math.PI) / 180,
    Math.log(
      Math.tan(
        Math.PI / 4 + (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 360,
      ),
    ),
  ];
  const unproject = ([x, y]: LngLat): LngLat => [
    (x * 180) / Math.PI,
    ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI,
  ];
  const radiansPerPixel = (2 * Math.PI) / (256 * 2 ** zoom);
  const from = project(route.from);
  const to = project(route.to);
  from[1] -= offsets[0] * radiansPerPixel;
  to[1] -= offsets[1] * radiansPerPixel;
  // Take the short arc when a trip crosses the antimeridian.
  const dx = ((to[0] - from[0] + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 1e-10) return null;
  const control: LngLat = [
    from[0] + dx / 2 - dy * 0.2,
    from[1] + dy / 2 + dx * 0.2,
  ];
  const at = (t: number): LngLat => [
    (1 - t) ** 2 * from[0] +
      2 * (1 - t) * t * control[0] +
      t ** 2 * (from[0] + dx),
    (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * control[1] + t ** 2 * to[1],
  ];
  const arrow = at(0.65);
  const beforeArrow = at(0.64);
  const tangent = [arrow[0] - beforeArrow[0], arrow[1] - beforeArrow[1]];
  const tangentLength = Math.hypot(...tangent);
  const unitX = tangent[0] / tangentLength;
  const unitY = tangent[1] / tangentLength;
  const depth = Math.min(14 * radiansPerPixel, length * 0.14);
  const halfWidth = Math.min(7 * radiansPerPixel, length * 0.08);
  const arrowBaseLeft: LngLat = [
    arrow[0] - unitX * depth - unitY * halfWidth,
    arrow[1] - unitY * depth + unitX * halfWidth,
  ];
  const arrowBaseRight: LngLat = [
    arrow[0] - unitX * depth + unitY * halfWidth,
    arrow[1] - unitY * depth - unitX * halfWidth,
  ];
  return {
    coordinates: Array.from({ length: 161 }, (_, index) =>
      unproject(at(index / 160)),
    ),
    arrowCoordinates: [
      [unproject(arrowBaseLeft), unproject(arrow)],
      [unproject(arrowBaseRight), unproject(arrow)],
    ],
  };
}
