import axios from "axios";

import type { SearchPlacesResponseDto } from "./search-places.dto";

export interface FoundPlace {
  key: string;
  name: string;
  address: string;
  kind: string;
  latitude: number;
  longitude: number;
}

export const searchPlaces = async (
  query: string,
  near: [number, number] | null,
): Promise<FoundPlace[]> => {
  const { data } = await axios.get<SearchPlacesResponseDto>(
    "https://photon.komoot.io/api/",
    {
      params: {
        q: query,
        limit: 6,
        ...(near
          ? { lat: near[0], lon: near[1], location_bias_scale: 0.1 }
          : {}),
      },
      timeout: 10000,
    },
  );

  return data.features.flatMap((feature) => {
    const { properties, geometry } = feature;
    if (!properties.name) return [];
    const [longitude, latitude] = geometry.coordinates;
    const street = [properties.street, properties.housenumber]
      .filter(Boolean)
      .join(", ");
    return [
      {
        key: `${properties.osm_id ?? ""}-${longitude}-${latitude}`,
        name: properties.name,
        address: [
          street,
          properties.city ?? properties.state,
          properties.country,
        ]
          .filter(Boolean)
          .join(", "),
        kind: properties.osm_value ?? properties.osm_key ?? "",
        latitude,
        longitude,
      },
    ];
  });
};
