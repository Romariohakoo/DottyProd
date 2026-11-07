"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { SearchResponse } from "ymaps3";
import {
  YANDEX_GEOCODER_API_KEY,
  YANDEX_SUGGEST_API_KEY,
} from "@shared/config";
import { useYandexMaps } from "@shared/lib";
import { Button, FormError, FormField, StatusMessage } from "@shared/ui";

import { geocodeAddress } from "../api/geocode-address";
import { PlaceMap } from "./place-map";

interface PlaceAddressSearchProps {
  id: string;
  address: string;
  error?: string;
  onAddressChange: (address: string) => void;
  onSelect: (result: SearchResponse[number]) => void;
}

export function PlaceAddressSearch({
  id,
  address,
  error,
  onAddressChange,
  onSelect,
}: PlaceAddressSearchProps) {
  const maps = useYandexMaps();
  const [addressError, setAddressError] = useState("");
  const suggestions = useMutation({
    mutationFn: async (text: string) => {
      if (!maps.data || !YANDEX_SUGGEST_API_KEY) {
        throw new Error("Подсказки адреса недоступны.");
      }
      const results = await maps.data.sdk.suggest({
        text,
        types: ["geo"],
        limit: 5,
        highlight: false,
      });
      return results.flatMap((result) =>
        result.uri ? [{ ...result, uri: result.uri }] : [],
      );
    },
  });
  const geocode = useMutation({
    mutationFn: geocodeAddress,
    onSuccess: (result) => {
      if (!result?.geometry) return;

      setAddressError("");
      onSelect(result);
    },
  });

  const findAddress = () => {
    if (!address.trim()) {
      setAddressError("Введите адрес для поиска.");
      return;
    }
    setAddressError("");
    suggestions.reset();
    geocode.reset();
    onAddressChange(address);
    suggestions.mutate(address.trim());
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <FormField
        label="Адрес"
        id={id}
        type="text"
        maxLength={1000}
        placeholder="Город, улица, дом"
        disabled={suggestions.isPending || geocode.isPending}
        error={addressError || error}
        value={address}
        onChange={(event) => {
          setAddressError("");
          suggestions.reset();
          geocode.reset();
          onAddressChange(event.target.value);
        }}
      />
      <Button
        type="button"
        variant="outlined"
        aria-busy={suggestions.isPending}
        onClick={findAddress}
        disabled={
          maps.isPending ||
          maps.isError ||
          !YANDEX_SUGGEST_API_KEY ||
          !YANDEX_GEOCODER_API_KEY ||
          suggestions.isPending ||
          geocode.isPending
        }
      >
        {suggestions.isPending ? "Ищем адрес…" : "Найти адрес"}
      </Button>
      {maps.isPending ? (
        <StatusMessage loading>Подготавливаем поиск адреса…</StatusMessage>
      ) : null}
      {maps.isError ? <FormError>{maps.error.message}</FormError> : null}
      {!YANDEX_SUGGEST_API_KEY ? (
        <FormError>
          Для подсказок не настроен NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY.
        </FormError>
      ) : null}
      {!YANDEX_GEOCODER_API_KEY ? (
        <FormError>
          Для определения координат не настроен
          NEXT_PUBLIC_YANDEX_GEOCODER_API_KEY.
        </FormError>
      ) : null}
      {suggestions.isPending ? (
        <StatusMessage loading>Ищем подсказки адреса…</StatusMessage>
      ) : null}
      {suggestions.isError ? (
        <FormError>
          {suggestions.error.message.includes("Status: 403")
            ? "Геосаджест отклонил доступ. Проверьте ключ API Геосаджеста и ограничения по домену."
            : "Не удалось получить подсказки адреса. Попробуйте ещё раз."}
        </FormError>
      ) : null}
      {suggestions.isSuccess && !suggestions.data?.length ? (
        <StatusMessage>
          Ничего не найдено. Уточните город, улицу и номер дома.
        </StatusMessage>
      ) : null}
      {suggestions.data?.length ? (
        <div className="flex min-w-0 flex-col gap-3">
          <p role="status" className="m3-support">
            Выберите подходящий адрес:
          </p>
          <ul aria-label="Подсказки адреса" className="flex flex-col gap-2">
            {suggestions.data.map((suggestion) => (
              <li key={suggestion.uri}>
                <Button
                  type="button"
                  variant="outlined"
                  className="w-full justify-start text-left"
                  disabled={geocode.isPending}
                  aria-pressed={geocode.variables === suggestion.uri}
                  onClick={() => {
                    geocode.reset();
                    onAddressChange(address);
                    geocode.mutate(suggestion.uri);
                  }}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>{suggestion.title.text}</span>
                    {suggestion.subtitle?.text ? (
                      <span className="m3-support">
                        {suggestion.subtitle.text}
                      </span>
                    ) : null}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {geocode.isPending ? (
        <StatusMessage loading>Определяем координаты адреса…</StatusMessage>
      ) : null}
      {geocode.isError ? <FormError>{geocode.error.message}</FormError> : null}
      {geocode.isSuccess && !geocode.data ? (
        <StatusMessage>
          Для этого адреса координаты не найдены. Выберите другой адрес или
          уточните запрос.
        </StatusMessage>
      ) : null}
      {geocode.data ? (
        <>
          <StatusMessage>
            Выбран адрес:{" "}
            {[geocode.data.properties.description, geocode.data.properties.name]
              .filter(Boolean)
              .join(", ")}
            . Проверьте точку на карте перед созданием места.
          </StatusMessage>
          <PlaceMap searchResult={geocode.data} />
        </>
      ) : null}
    </div>
  );
}
