import { API_BASE_URL, TRIP_COVERS } from "@shared/config";

export function mediaUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/api/") ? `${API_BASE_URL}${url}` : url;
}

const COVER_HINTS: [RegExp, string][] = [
  [/казан/i, "/covers/kazan.jpg"],
  [/петербург|питер/i, "/covers/saint-petersburg.jpg"],
  [/сочи|мор[еяю]|пляж|крым/i, "/covers/sea.jpg"],
  [/гор[ыа]|алтай|кавказ|эльбрус/i, "/covers/mountain-lake.jpg"],
];

export const tripCoverUrl = (
  url: string | null,
  trip: { id: number; title: string },
) =>
  mediaUrl(url) ??
  COVER_HINTS.find(([pattern]) => pattern.test(trip.title))?.[1] ??
  TRIP_COVERS[trip.id % TRIP_COVERS.length].src;
