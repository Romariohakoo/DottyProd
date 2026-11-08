"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import type { PlaceInputDto, PlaceRefDto } from "@shared/api";
import {
  TRANSIT_HUBS,
  type TransitHub,
  YANDEX_GEOCODER_API_KEY,
  YANDEX_SUGGEST_API_KEY,
} from "@shared/config";
import { useYandexMaps } from "@shared/lib";
import { Icon, type IconName } from "@shared/ui";

import { geocodeAddress } from "../api/geocode-address";
import { searchPlaces } from "../api/search-places";
import type { Place } from "../model";

export type StopValue =
  { kind: "existing"; id: number } | { kind: "new"; place: PlaceInputDto };

export const hubToPlace = (hub: TransitHub): PlaceInputDto => ({
  name: hub.code ? `${hub.name} (${hub.code})` : hub.name,
  address: hub.city,
  latitude: hub.latitude,
  longitude: hub.longitude,
});

export const stopToDto = (value: StopValue): PlaceRefDto | PlaceInputDto =>
  value.kind === "existing" ? { id: value.id } : value.place;

export const stopName = (value: StopValue | null, places: Place[]) =>
  !value
    ? ""
    : value.kind === "existing"
      ? (places.find((place) => place.id === value.id)?.name ?? "")
      : value.place.name;

export const sameStop = (left: StopValue | null, right: StopValue | null) =>
  Boolean(
    left &&
    right &&
    (left.kind === "existing" && right.kind === "existing"
      ? left.id === right.id
      : left.kind === "new" &&
        right.kind === "new" &&
        left.place.latitude === right.place.latitude &&
        left.place.longitude === right.place.longitude),
  );

export const stopCoords = (value: StopValue | null, places: Place[]) =>
  !value
    ? null
    : value.kind === "new"
      ? value.place
      : (places.find((place) => place.id === value.id) ?? null);

const capitalize = (text: string) =>
  text ? text[0].toLocaleUpperCase("ru-RU") + text.slice(1) : text;

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const placesCenter = (places: Place[]): [number, number] | null =>
  places.length
    ? [
        median(places.map((place) => place.latitude)),
        median(places.map((place) => place.longitude)),
      ]
    : null;

interface Option {
  key: string;
  icon: IconName;
  tone: "trip" | "hub" | "map" | "text";
  title: string;
  subtitle?: string;
  badge?: string;
  kind?: string;
  pick: () => StopValue | Promise<StopValue>;
}

interface Found {
  key: string;
  title: string;
  subtitle: string;
  kind: string;
  resolve: () => Promise<PlaceInputDto>;
}

const KIND_ICONS: [RegExp, IconName][] = [
  [
    /restaurant|cafe|fast_food|bar|pub|food|bakery|ice_cream|biergarten/,
    "food",
  ],
  [/hotel|hostel|guest_house|motel|apartment|chalet/, "bed"],
  [/theatre|cinema|arts_centre|concert|music/, "star"],
  [/aerodrome|airport|terminal/, "plane"],
  [/station|halt|railway/, "train"],
  [/bus/, "bus"],
  [/park|garden|square|pedestrian|viewpoint|beach|residential|footway/, "walk"],
  [
    /museum|gallery|artwork|attraction|monument|memorial|castle|worship|church|mosque|tourism/,
    "museum",
  ],
];

const kindIcon = (kind: string): IconName =>
  KIND_ICONS.find(([pattern]) => pattern.test(kind))?.[1] ?? "pin";

interface PlaceComboboxProps {
  places: Place[];
  value: StopValue | null;
  onChange: (value: StopValue | null, kind?: string) => void;
  placeholder: string;
  hubKind?: TransitHub["kind"] | null;
  autoFocus?: boolean;
  large?: boolean;
  alignEnd?: boolean;
}

const matches = (text: string, query: string) =>
  text.toLowerCase().includes(query.trim().toLowerCase());

const HUB_NAMES: Record<TransitHub["kind"], RegExp> = {
  airport: /аэропорт|airport|\([A-Z]{3}\)/i,
  station: /вокзал|станци|station/i,
};

export const isHubPlace = (name: string, kind: TransitHub["kind"]) =>
  HUB_NAMES[kind].test(name);

const TONES: Record<Option["tone"], string> = {
  trip: "bg-on-surface text-surface-bright",
  hub: "bg-primary-container text-primary",
  map: "bg-surface-container-high text-on-surface",
  text: "border-2 border-dashed border-outline text-on-surface-variant",
};

export function PlaceCombobox({
  places,
  value,
  onChange,
  placeholder,
  hubKind = null,
  autoFocus,
  large = false,
  alignEnd = false,
}: PlaceComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const maps = useYandexMaps();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const canSearch =
    Boolean(maps.data) &&
    Boolean(YANDEX_SUGGEST_API_KEY) &&
    Boolean(YANDEX_GEOCODER_API_KEY);
  const text = query.trim();

  const center = placesCenter(places);
  const cityHub = TRANSIT_HUBS.find((hub) => text && matches(hub.city, text));
  const approx: [number, number] | null =
    center ?? (cityHub ? [cityHub.latitude, cityHub.longitude] : null);

  const suggest = useMutation({
    mutationFn: async (input: string): Promise<Found[]> => {
      if (canSearch && maps.data) {
        const results = await maps.data.sdk.suggest({
          text: input,
          types: ["biz", "geo"],
          limit: 5,
          highlight: false,
        });
        return results.flatMap((result) => {
          const uri = result.uri;
          if (!uri) return [];
          const title = result.title.text;
          const subtitle = result.subtitle?.text ?? "";
          return [
            {
              key: uri,
              title,
              subtitle,
              kind: "",
              resolve: async () => {
                const found = await geocodeAddress(uri);
                if (!found?.geometry) throw new Error("no coordinates");
                const [longitude, latitude] = found.geometry.coordinates;
                return {
                  name: title.slice(0, 200),
                  address: subtitle || null,
                  latitude,
                  longitude,
                };
              },
            },
          ];
        });
      }
      const results = await searchPlaces(input, center);
      return results.map((item) => ({
        key: item.key,
        title: item.name,
        subtitle: item.address,
        kind: item.kind,
        resolve: () =>
          Promise.resolve({
            name: item.name.slice(0, 200),
            address: item.address.slice(0, 500) || null,
            latitude: item.latitude,
            longitude: item.longitude,
          }),
      }));
    },
  });
  const { mutate: runSuggest, reset: resetSuggest } = suggest;

  useEffect(() => {
    if (autoFocus && document.activeElement === inputRef.current) setOpen(true);
  }, [autoFocus]);

  useEffect(() => {
    if (!open || text.length < 2) {
      resetSuggest();
      return;
    }
    const timer = setTimeout(() => runSuggest(text), 350);
    return () => clearTimeout(timer);
  }, [open, text, runSuggest, resetSuggest]);

  const options: Option[] = [
    ...places
      .filter((place) =>
        text
          ? matches(place.name, text)
          : !hubKind || isHubPlace(place.name, hubKind),
      )
      .slice(0, 6)
      .map<Option>((place) => ({
        key: `trip-${place.id}`,
        icon: isHubPlace(place.name, "airport")
          ? "plane"
          : isHubPlace(place.name, "station")
            ? "train"
            : "pin",
        tone: "trip",
        title: place.name,
        pick: () => ({ kind: "existing", id: place.id }),
      })),
    ...TRANSIT_HUBS.filter((hub) =>
      text
        ? matches(hub.name, text) ||
          matches(hub.city, text) ||
          matches(hub.code ?? "", text)
        : hub.kind === hubKind &&
          !places.some((place) => place.name === hubToPlace(hub).name),
    )
      .sort(
        (left, right) =>
          Number(right.kind === hubKind) - Number(left.kind === hubKind),
      )
      .slice(0, 4)
      .map<Option>((hub) => ({
        key: `hub-${hub.code ?? hub.name}`,
        icon: hub.kind === "airport" ? "plane" : "train",
        tone: "hub",
        title: hub.name,
        subtitle: hub.city,
        badge: hub.code,
        pick: () => ({ kind: "new", place: hubToPlace(hub) }),
      })),
    ...(suggest.data ?? []).map<Option>((item) => ({
      key: `map-${item.key}`,
      icon: kindIcon(item.kind),
      tone: "map",
      title: item.title,
      subtitle: item.subtitle,
      kind: item.kind,
      pick: async () => ({ kind: "new", place: await item.resolve() }),
    })),
    ...(text &&
    approx &&
    !suggest.isPending &&
    (suggest.isError || suggest.data?.length === 0)
      ? [
          {
            key: "text",
            icon: "plus" as const,
            tone: "text" as const,
            title: capitalize(text),
            subtitle: "Без адреса",
            pick: (): StopValue => ({
              kind: "new",
              place: {
                name: capitalize(text).slice(0, 200),
                address: null,
                latitude: approx[0],
                longitude: approx[1],
              },
            }),
          },
        ]
      : []),
  ];

  const choose = async (option: Option | undefined) => {
    if (!option) return;
    setBusy(true);
    try {
      onChange(await option.pick(), option.kind);
      setOpen(false);
      setQuery("");
    } catch {
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const shown = value && !open ? stopName(value, places) : query;

  return (
    <div className="contents">
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-medium px-2 ${
          large
            ? "h-14 border border-outline bg-surface-bright text-lg focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-container"
            : "h-11 hover:bg-surface-container-low focus-within:bg-surface-container-low"
        }`}
      >
        {large ? (
          <Icon
            name="search"
            size={20}
            className="ml-1.5 shrink-0 text-on-surface-variant"
          />
        ) : null}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={shown}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
            setActive(0);
            if (value) onChange(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open && options.length) {
              event.preventDefault();
              void choose(options[active]);
            } else if (event.key === "Escape" && open) {
              event.stopPropagation();
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
          }}
          className={`min-w-0 flex-1 truncate bg-transparent font-extrabold outline-none ${alignEnd ? "text-right" : ""} placeholder:font-bold placeholder:text-on-surface-variant ${large ? "" : "text-lg"}`}
        />
        {busy || suggest.isPending ? (
          <span className="m3-loading scale-75" aria-label="Ищем" />
        ) : value?.kind === "new" && !open ? (
          <span className="shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-bold text-primary">
            новое
          </span>
        ) : null}
      </div>

      {open && options.length ? (
        <ul
          id={listId}
          role="listbox"
          className="m3-thin-scroll order-last mt-1 mb-2 flex max-h-72 basis-full flex-col gap-0.5 overflow-y-auto rounded-large bg-surface-bright p-1.5 shadow-[0_8px_24px_#0000001f,0_0_0_1px_var(--outline-variant)]"
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              role="option"
              aria-selected={index === active}
              className={
                index > 0 && options[index - 1].tone !== option.tone
                  ? "mt-1 border-t border-outline-variant pt-1"
                  : undefined
              }
            >
              <button
                type="button"
                tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => void choose(option)}
                className={`flex w-full items-center gap-3 rounded-medium px-2 py-2 text-left ${index === active ? "bg-surface-container" : ""}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${TONES[option.tone]}`}
                >
                  <Icon name={option.icon} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-bold">{option.title}</b>
                  {option.subtitle ? (
                    <span className="block truncate text-xs text-on-surface-variant">
                      {option.subtitle}
                    </span>
                  ) : null}
                </span>
                {option.badge ? (
                  <span className="rounded-small bg-surface-container px-1.5 py-0.5 font-mono text-xs font-bold">
                    {option.badge}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
