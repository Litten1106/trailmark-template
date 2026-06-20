/**
 * Mapbox GL JS configuration.
 *
 * Set in `.env.local`:
 *
 *   PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
 *
 * Create a token at https://account.mapbox.com/access-tokens/
 */

import { itinerary } from '../data/itinerary';
import type { LngLat } from '../data/types';

const MAPBOX_STYLE_DEFAULT = 'mapbox://styles/mapbox/streets-v12';

export const DEFAULT_ZOOM = 10;

/** Brand green used for POI markers (matches --green). */
export const POI_MARKER_COLOR = '#6b8f6b';

export function getMapboxAccessToken(): string | null {
  try {
    const token =
      (typeof import.meta !== 'undefined' &&
        import.meta.env?.PUBLIC_MAPBOX_ACCESS_TOKEN) ||
      (typeof process !== 'undefined' &&
        process.env?.PUBLIC_MAPBOX_ACCESS_TOKEN) ||
      (typeof window !== 'undefined' &&
        (window as unknown as Record<string, string>)[
          'PUBLIC_MAPBOX_ACCESS_TOKEN'
        ]);
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function getMapboxStyleUrl(): string {
  try {
    const style =
      (typeof import.meta !== 'undefined' &&
        import.meta.env?.PUBLIC_MAPBOX_STYLE) ||
      (typeof process !== 'undefined' && process.env?.PUBLIC_MAPBOX_STYLE);
    return typeof style === 'string' && style.length > 0
      ? style
      : MAPBOX_STYLE_DEFAULT;
  } catch {
    return MAPBOX_STYLE_DEFAULT;
  }
}

/** Collect all POI coordinates from the current itinerary. */
export function allTripCoordinates(): LngLat[] {
  return itinerary.pois
    .filter((p): p is typeof p & { location: LngLat } => p.location != null)
    .map((p) => p.location);
}

/** Centroid of all located POIs, or Tokyo fallback for empty data. */
export function getTripCenter(): LngLat {
  const coords = allTripCoordinates();
  if (coords.length === 0) return [139.6917, 35.6895];
  const [sumLng, sumLat] = coords.reduce(
    ([lng, lat], [cLng, cLat]) => [lng + cLng, lat + cLat],
    [0, 0],
  );
  return [sumLng / coords.length, sumLat / coords.length];
}

/** Bounding box `[[west, south], [east, north]]` from itinerary POIs. */
export function getTripBounds(): [[number, number], [number, number]] | null {
  const coords = allTripCoordinates();
  if (coords.length === 0) return null;

  let west = coords[0][0];
  let east = coords[0][0];
  let south = coords[0][1];
  let north = coords[0][1];

  for (const [lng, lat] of coords) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }

  const padLng = Math.max(0.02, (east - west) * 0.12);
  const padLat = Math.max(0.02, (north - south) * 0.12);

  return [
    [west - padLng, south - padLat],
    [east + padLng, north + padLat],
  ];
}

/** @deprecated Use getTripCenter — kept for gradual migration */
export const TRIP_CENTER = getTripCenter();
