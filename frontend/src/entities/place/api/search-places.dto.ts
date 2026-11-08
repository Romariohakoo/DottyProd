export interface SearchPlacesResponseDto {
  features: {
    geometry: { coordinates: [number, number] };
    properties: {
      osm_id?: number;
      osm_key?: string;
      osm_value?: string;
      name?: string;
      street?: string;
      housenumber?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }[];
}
