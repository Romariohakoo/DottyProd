import axios, { isAxiosError } from "axios";
import type { LngLat } from "ymaps3";

import { YANDEX_GEOCODER_API_KEY } from "@shared/config";

import type { GeocodeAddressResponseDto } from "./geocode-address.dto";

export async function geocodeCoordinates(
  coordinates: LngLat,
  signal: AbortSignal,
): Promise<string | null> {
  if (!YANDEX_GEOCODER_API_KEY) {
    throw new Error(
      "Для определения адреса не настроен NEXT_PUBLIC_YANDEX_GEOCODER_API_KEY.",
    );
  }

  try {
    const { data } = await axios.get<GeocodeAddressResponseDto>(
      "https://geocode-maps.yandex.ru/v1/",
      {
        params: {
          apikey: YANDEX_GEOCODER_API_KEY,
          geocode: coordinates.join(","),
          sco: "longlat",
          lang: "ru_RU",
          format: "json",
          results: 1,
        },
        signal,
        timeout: 15000,
      },
    );
    const object =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    return object
      ? [object.description, object.name].filter(Boolean).join(", ") || null
      : null;
  } catch (error) {
    if (signal.aborted) throw error;
    if (isAxiosError(error)) {
      throw new Error(
        error.response?.status === 403
          ? "Геокодер отклонил доступ. Проверьте ключ API Геокодера и ограничения по домену."
          : "Не удалось определить адрес. Выберите точку ещё раз или отмените добавление.",
        { cause: error },
      );
    }
    throw error;
  }
}
