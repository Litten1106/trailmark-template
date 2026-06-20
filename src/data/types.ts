export type LngLat = [number, number]; // [lng, lat]

export type PoiCategory =
  | 'sight'
  | 'food'
  | 'lodging'
  | 'drive'
  | 'experience'
  | 'transit';

export interface Poi {
  id: string;
  /** Primary name (Chinese). */
  name: string;
  /** Original / English name when documented. */
  nameEn?: string;
  category: PoiCategory;
  /**
   * `[lng, lat]`. Leave undefined when not yet filled — the map skips POIs
   * without coordinates instead of failing. v1 of the wiki has placeholder
   * coords for many stops; the user fills these in over time.
   */
  location?: LngLat;
  /** Confidence flag for the coordinate, audit-friendly. */
  coordsConfidence?: 'high' | 'estimated' | 'pending';
  address?: string;
  notes?: string;
  /** "HH:mm" approximate planned arrival. */
  plannedAt?: string;
  durationMin?: number;
  /** Local image paths (under /public/images/poi/) or absolute URLs. */
  photos?: string[];
  /** Free-form related links. */
  link?: string;
  /** Override Google Maps query string. Defaults to nameEn || name. */
  googleQuery?: string;
  /** Driving distance from the previous POI in km. */
  drivingFromPrevKm?: number;
  /** Driving duration from the previous POI, free-form e.g. "45 分钟". */
  drivingFromPrevDuration?: string;
}

export interface DayPlan {
  day: number;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  summary?: string;
  drivingKm?: number;
  /** Free-form, e.g. "约 5 小时". */
  drivingDuration?: string;
  /** Town / hotel name where the night ends. */
  lodging?: string;
  /** Bullets pulled from the source doc — not formal POIs. */
  highlights?: string[];
  /** Ordered POI ids visited that day. */
  poiIds: string[];
  /** Day-level illustration / cover image (gpt-image-2 generated). */
  photos?: string[];
}

export interface ItineraryMetadata {
  /** Free-form tips, packing list, emergency contacts… */
  tips?: { title: string; body: string }[];
}

export interface Itinerary {
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  pois: Poi[];
  days: DayPlan[];
  metadata?: ItineraryMetadata;
}

/** Build a Google Maps "search" URL that opens the app on mobile. */
export function googleMapsUrl(poi: Poi): string {
  const q = poi.googleQuery || poi.nameEn || poi.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
