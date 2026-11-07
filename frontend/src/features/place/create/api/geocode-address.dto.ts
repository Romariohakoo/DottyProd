export interface GeocodeAddressResponseDto {
  response: {
    GeoObjectCollection: {
      featureMember: {
        GeoObject: {
          name: string;
          description?: string;
          Point: {
            pos: string;
          };
        };
      }[];
    };
  };
}
