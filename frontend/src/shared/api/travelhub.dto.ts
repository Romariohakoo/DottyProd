export type TripRole = "owner" | "editor" | "viewer";
export type ActivityCategory =
  | "excursion"
  | "museum"
  | "theater"
  | "walk"
  | "accommodation"
  | "restaurant"
  | "meeting"
  | "other";
export type TransportType = "walk" | "car" | "train" | "plane" | "other";

export interface TripDto {
  id: number;
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripCardDto {
  id: number;
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  coverUrl: string | null;
  role: TripRole;
}

export interface PlaceDto {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

interface EventBaseDto {
  id: number;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  bookingUrl: string | null;
  createdBy: number;
}

export interface ActivityDto extends EventBaseDto {
  type: "activity";
  category: ActivityCategory;
  place: PlaceDto | null;
}

export interface MovementDto extends EventBaseDto {
  type: "movement";
  transportType: TransportType;
  fromPlace: PlaceDto;
  toPlace: PlaceDto;
}

export type EventDto = ActivityDto | MovementDto;

export interface TripDetailDto {
  trip: TripDto;
  role: TripRole;
  places: PlaceDto[];
  timeline: EventDto[];
}

export interface TripInputDto {
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  description?: string | null;
  coverUrl?: string | null;
}

export interface PlaceInputDto {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
}

export interface PlaceRefDto {
  id: number;
}

interface EventBaseInputDto {
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  bookingUrl?: string | null;
}

export interface ActivityInputDto extends EventBaseInputDto {
  type: "activity";
  category?: ActivityCategory;
  place?: PlaceRefDto | PlaceInputDto | null;
}

export interface MovementInputDto extends EventBaseInputDto {
  type: "movement";
  transportType: TransportType;
  fromPlace: PlaceRefDto | PlaceInputDto;
  toPlace: PlaceRefDto | PlaceInputDto;
}

export type EventInputDto = ActivityInputDto | MovementInputDto;
