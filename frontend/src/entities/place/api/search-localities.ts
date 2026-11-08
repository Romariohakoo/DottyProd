import axios from "axios";

import type { SearchPlacesResponseDto } from "./search-places.dto";

export type LocalityKind = "locality" | "country";

export interface FoundLocality {
  key: string;
  name: string;
  region: string;
  country: string;
  kind: "city" | "region" | "country";
}

const RANK: Record<string, number> = {
  city: 0,
  town: 1,
  state: 2,
  country: 3,
};

export const searchLocalities = async (
  query: string,
  kind: LocalityKind,
): Promise<FoundLocality[]> => {
  const params = new URLSearchParams({ q: query, limit: "12" });
  (kind === "country" ? ["country"] : ["city", "state"]).forEach((layer) =>
    params.append("layer", layer),
  );
  const { data } = await axios.get<SearchPlacesResponseDto>(
    `https://photon.komoot.io/api/?${params}`,
    { timeout: 10000 },
  );

  const seen = new Set<string>();
  return data.features
    .map((feature) => feature.properties)
    .filter((item) => item.name && (item.osm_value ?? "") in RANK)
    .sort(
      (left, right) => RANK[left.osm_value ?? ""] - RANK[right.osm_value ?? ""],
    )
    .flatMap((item) => {
      const value = item.osm_value ?? "";
      const key = `${item.name}|${item.state ?? ""}|${item.country ?? ""}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          key,
          name: item.name ?? "",
          region:
            value === "state" || value === "country" ? "" : (item.state ?? ""),
          country:
            value === "country" ? (item.name ?? "") : (item.country ?? ""),
          kind:
            value === "country"
              ? ("country" as const)
              : value === "state"
                ? ("region" as const)
                : ("city" as const),
        },
      ];
    })
    .slice(0, 6);
};
