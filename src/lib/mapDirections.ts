import type { LngLat } from '../data/types';
import { getMapboxAccessToken } from './map';
import { straightLineGeometry } from './mapLayers';

export interface DirectionsLeg {
  distanceM: number;
  durationS: number;
}

export interface DayDirectionsResult {
  geometry: GeoJSON.LineString;
  legs: DirectionsLeg[];
  fallback: boolean;
}

const directionsCache = new Map<string, Promise<DayDirectionsResult>>();

function cacheKey(coords: LngLat[]): string {
  return coords.map((c) => c.join(',')).join(';');
}

function haversineM(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fallbackDirections(coords: LngLat[]): DayDirectionsResult {
  const legs: DirectionsLeg[] = [];
  for (let i = 1; i < coords.length; i++) {
    const distanceM = haversineM(coords[i - 1], coords[i]);
    legs.push({
      distanceM,
      durationS: Math.round((distanceM / 1000 / 60) * 3600),
    });
  }
  return {
    geometry: straightLineGeometry(coords),
    legs,
    fallback: true,
  };
}

export async function fetchDayDirections(
  coords: LngLat[],
): Promise<DayDirectionsResult> {
  if (coords.length < 2) {
    return {
      geometry: straightLineGeometry(coords),
      legs: [],
      fallback: true,
    };
  }

  const key = cacheKey(coords);
  const cached = directionsCache.get(key);
  if (cached) return cached;

  const promise = (async (): Promise<DayDirectionsResult> => {
    const token = getMapboxAccessToken();
    if (!token) return fallbackDirections(coords);

    const coordPath = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPath}` +
      `?geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(token)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return fallbackDirections(coords);
      const json = (await res.json()) as {
        routes?: {
          geometry: GeoJSON.LineString;
          legs: { distance: number; duration: number }[];
        }[];
      };
      const route = json.routes?.[0];
      if (!route) return fallbackDirections(coords);

      return {
        geometry: route.geometry,
        legs: route.legs.map((leg) => ({
          distanceM: leg.distance,
          durationS: leg.duration,
        })),
        fallback: false,
      };
    } catch {
      return fallbackDirections(coords);
    }
  })();

  directionsCache.set(key, promise);
  return promise;
}

export function formatLegDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} 米`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} 公里`;
}

export function formatLegDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}
