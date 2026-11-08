"use client";

import { Icon } from "@shared/ui";

import type { Place } from "../model";
import { isHubPlace } from "./place-stop-field";

interface PlaceListProps {
  places: Place[];
  numbers?: Map<number, number>;
  onSelect: (placeId: number) => void;
}

export function PlaceList({ places, numbers, onSelect }: PlaceListProps) {
  return (
    <ul className="grid min-w-0 gap-2 md:grid-cols-2">
      {[...places]
        .sort(
          (left, right) =>
            (numbers?.get(left.id) ?? Infinity) -
            (numbers?.get(right.id) ?? Infinity),
        )
        .map((place) => {
          const number = numbers?.get(place.id);
          return (
            <li key={place.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(place.id)}
                className="group flex w-full items-center gap-3 rounded-large bg-surface-bright p-3 text-left shadow-1 transition-shadow hover:shadow-2"
              >
                <span className="relative grid size-12 shrink-0 place-items-center rounded-large bg-primary-container text-primary">
                  <Icon
                    name={
                      isHubPlace(place.name, "airport")
                        ? "plane"
                        : isHubPlace(place.name, "station")
                          ? "train"
                          : "pin"
                    }
                    size={20}
                  />
                  {number ? (
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-on-surface text-[10px] font-extrabold text-surface-bright ring-2 ring-surface-bright">
                      {number}
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-extrabold">{place.name}</b>
                  {place.address ? (
                    <span className="block truncate text-sm text-on-surface-variant">
                      {place.address}
                    </span>
                  ) : null}
                </span>
                <Icon
                  name="next"
                  size={18}
                  className="shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            </li>
          );
        })}
    </ul>
  );
}
