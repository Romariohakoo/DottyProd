"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { useQuery } from "@tanstack/react-query";

import { YANDEX_MAPS_API_KEY, YANDEX_SUGGEST_API_KEY } from "@shared/config";

export function useYandexMaps() {
  return useQuery({
    queryKey: ["yandex-maps-sdk"],
    queryFn: async () => {
      if (!YANDEX_MAPS_API_KEY) {
        throw new Error(
          "Для карты не настроен NEXT_PUBLIC_YANDEX_MAPS_API_KEY.",
        );
      }
      if (typeof ymaps3 === "undefined") {
        throw new Error(
          "Не удалось загрузить Яндекс Карты. Обновите страницу.",
        );
      }

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error("Яндекс Карты не ответили. Обновите страницу.")),
          15000,
        );
      });

      try {
        await Promise.race([ymaps3.ready, timeout]);
        const { reactify } = await Promise.race([
          ymaps3.import("@yandex/ymaps3-reactify"),
          timeout,
        ]);
        // The SDK locks its configuration when the first map is created.
        if (YANDEX_SUGGEST_API_KEY) {
          ymaps3
            .getDefaultConfig()
            .setApikeys({ suggest: YANDEX_SUGGEST_API_KEY });
        }
        const boundReactify = reactify.bindTo(React, ReactDOM);

        return {
          sdk: ymaps3,
          reactify: boundReactify,
          components: boundReactify.module(ymaps3),
        };
      } catch {
        throw new Error(
          "Не удалось подготовить Яндекс Карты. Проверьте подключение и API-ключ, затем обновите страницу.",
        );
      } finally {
        clearTimeout(timer);
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
