"use client";

import { useEffect, useId, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import type { PlaceInputDto } from "@shared/api";
import {
  YANDEX_GEOCODER_API_KEY,
  YANDEX_SUGGEST_API_KEY,
} from "@shared/config";
import { useYandexMaps } from "@shared/lib";
import { Icon } from "@shared/ui";

import { geocodeAddress } from "../api/geocode-address";
import { PlaceMap } from "./place-map";

interface PlacePickerProps {
  value: PlaceInputDto | null;
  onChange: (value: PlaceInputDto | null) => void;
  autoFocus?: boolean;
  initialQuery?: string;
}

interface Suggestion {
  uri: string;
  title: string;
  subtitle: string;
}

export function PlacePicker({
  value,
  onChange,
  autoFocus,
  initialQuery = "",
}: PlacePickerProps) {
  const inputId = useId();
  const maps = useYandexMaps();
  const [query, setQuery] = useState(initialQuery);
  const [manual, setManual] = useState(false);
  const [coords, setCoords] = useState({
    name: initialQuery,
    lat: "",
    lon: "",
  });
  const canSearch =
    Boolean(maps.data) &&
    Boolean(YANDEX_SUGGEST_API_KEY) &&
    Boolean(YANDEX_GEOCODER_API_KEY);
  const searchUnavailable = !maps.isPending && (!canSearch || maps.isError);

  const suggest = useMutation({
    mutationFn: async (text: string): Promise<Suggestion[]> => {
      if (!maps.data) return [];
      const results = await maps.data.sdk.suggest({
        text,
        types: ["geo", "biz"],
        limit: 6,
        highlight: false,
      });
      return results.flatMap((result) =>
        result.uri
          ? [
              {
                uri: result.uri,
                title: result.title.text,
                subtitle: result.subtitle?.text ?? "",
              },
            ]
          : [],
      );
    },
  });

  const geocode = useMutation({
    mutationFn: async (suggestion: Suggestion) => {
      const result = await geocodeAddress(suggestion.uri);
      if (!result?.geometry) throw new Error("Координаты не найдены");
      const [longitude, latitude] = result.geometry.coordinates;
      return {
        name: suggestion.title.slice(0, 200),
        address: suggestion.subtitle || result.properties.description || null,
        latitude,
        longitude,
      };
    },
    onSuccess: (place) => {
      onChange(place);
      setQuery("");
      suggest.reset();
    },
  });

  const { mutate: runSuggest, reset: resetSuggest } = suggest;
  useEffect(() => {
    if (!canSearch || query.trim().length < 2) {
      resetSuggest();
      return;
    }
    const timer = setTimeout(() => runSuggest(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query, canSearch, runSuggest, resetSuggest]);

  const manualLat = Number(coords.lat.replace(",", "."));
  const manualLon = Number(coords.lon.replace(",", "."));
  const manualValid =
    coords.name.trim() !== "" &&
    coords.lat.trim() !== "" &&
    coords.lon.trim() !== "" &&
    Number.isFinite(manualLat) &&
    Number.isFinite(manualLon) &&
    Math.abs(manualLat) <= 90 &&
    Math.abs(manualLon) <= 180;

  if (value && !manual) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-medium bg-primary-container p-3 text-on-primary-container">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <Icon name="pin" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-extrabold">{value.name}</b>
            <span className="block truncate text-sm opacity-80">
              {value.address ??
                `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-sm font-bold underline"
          >
            Изменить
          </button>
        </div>
        {maps.data ? (
          <PlaceMap
            places={[{ id: -1, ...value, address: value.address ?? null }]}
            className="h-40 w-full overflow-hidden rounded-medium"
          />
        ) : null}
      </div>
    );
  }

  if (manual || searchUnavailable) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={coords.name}
          onChange={(event) =>
            setCoords((previous) => ({ ...previous, name: event.target.value }))
          }
          onFocus={() => setManual(true)}
          placeholder="Название места"
          aria-label="Название места"
          className="m3-input"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={coords.lat}
            inputMode="decimal"
            onChange={(event) =>
              setCoords((previous) => ({
                ...previous,
                lat: event.target.value,
              }))
            }
            onFocus={() => setManual(true)}
            placeholder="Широта"
            aria-label="Широта"
            className="m3-input"
          />
          <input
            value={coords.lon}
            inputMode="decimal"
            onChange={(event) =>
              setCoords((previous) => ({
                ...previous,
                lon: event.target.value,
              }))
            }
            onFocus={() => setManual(true)}
            placeholder="Долгота"
            aria-label="Долгота"
            className="m3-input"
          />
        </div>
        <button
          type="button"
          disabled={!manualValid}
          onClick={() => {
            onChange({
              name: coords.name.trim().slice(0, 200),
              address: null,
              latitude: manualLat,
              longitude: manualLon,
            });
            setManual(false);
          }}
          className="m3-button min-h-10 self-start py-1"
        >
          <Icon name="check" size={16} />
          Готово
        </button>
        {!searchUnavailable ? (
          <button
            type="button"
            onClick={() => {
              setManual(false);
              onChange(null);
            }}
            className="self-start text-sm font-bold text-primary underline"
          >
            Поиск
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="flex h-14 items-center gap-3 rounded-large border border-outline bg-surface-bright px-4 text-lg focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-container"
      >
        <Icon name="pin" size={18} className="text-on-surface-variant" />
        <input
          id={inputId}
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={maps.isPending ? "Загружаем поиск…" : "Найти место"}
          disabled={maps.isPending}
          className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
        />
        {suggest.isPending || geocode.isPending ? (
          <span className="m3-loading text-xs" aria-label="Ищем" />
        ) : null}
      </label>
      {suggest.data?.length ? (
        <ul
          aria-label="Найденные места"
          className="flex flex-col overflow-hidden rounded-medium border border-outline-variant"
        >
          {suggest.data.map((item) => (
            <li
              key={item.uri}
              className="border-b border-outline-variant last:border-0"
            >
              <button
                type="button"
                disabled={geocode.isPending}
                onClick={() => geocode.mutate(item)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-container"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="pin" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-bold">
                    {item.title}
                  </b>
                  {item.subtitle ? (
                    <span className="block truncate text-xs text-on-surface-variant">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-primary text-primary group-hover:bg-primary group-hover:text-on-primary">
                  <Icon name="plus" size={16} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : suggest.isSuccess && query.trim().length >= 2 ? (
        <p className="m3-support px-1">Ничего не нашли</p>
      ) : null}
      {geocode.isError || suggest.isError ? (
        <p role="alert" className="m3-support m3-field-error px-1">
          Не нашли координаты
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setManual(true)}
        className="self-start px-1 text-sm font-bold text-on-surface-variant underline hover:text-on-surface"
      >
        Координаты
      </button>
    </div>
  );
}
