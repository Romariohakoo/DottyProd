import axios, { isAxiosError } from "axios";
import type { SearchResponse } from "ymaps3";

import { YANDEX_GEOCODER_API_KEY } from "@shared/config";

import type { GeocodeAddressResponseDto } from "./geocode-address.dto";

export const geocodeAddress = async (
  uri: string,
): Promise<SearchResponse[number] | null> => {
  if (!YANDEX_GEOCODER_API_KEY) {
    throw new Error(
      "Для определения координат не настроен NEXT_PUBLIC_YANDEX_GEOCODER_API_KEY.",
    );
  }

  try {
    // Use the public Yandex endpoint without the backend client's auth headers.
    const { data } = await axios.get<GeocodeAddressResponseDto>(
      "https://geocode-maps.yandex.ru/v1/",
      {
        params: {
          apikey: YANDEX_GEOCODER_API_KEY,
          uri,
          lang: "ru_RU",
          format: "json",
          results: 1,
        },
        timeout: 15000,
      },
    );
    const object =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!object) return null;

    const position = object.Point?.pos?.trim().split(/\s+/);
    if (!position || position.length !== 2) {
      throw new Error("Геокодер вернул некорректные координаты.");
    }
    const [longitude, latitude] = position.map(Number);
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      Math.abs(longitude) > 180 ||
      Math.abs(latitude) > 90
    ) {
      throw new Error("Геокодер вернул некорректные координаты.");
    }

    return {
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: { name: object.name, description: object.description ?? "" },
    };
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.status === 403
          ? "Геокодер отклонил доступ. Проверьте ключ API Геокодера и ограничения по домену."
          : "Не удалось определить координаты. Попробуйте выбрать адрес ещё раз.",
        { cause: error },
      );
    }
    throw error;
  }
};
