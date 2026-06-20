import type { Poi } from '../data/types';

export const POI_SOURCE_ID = 'pois';
export const POI_CIRCLE_LAYER_ID = 'pois-circles';
export const POI_LABEL_LAYER_ID = 'pois-labels';
export const POI_LODGING_LAYER_ID = 'pois-lodging';
export const POI_LODGING_LABEL_LAYER_ID = 'pois-lodging-labels';
export const LODGING_PIN_IMAGE_ID = 'lodging-pin';

export const CONNECTOR_SOURCE_ID = 'route-connectors';
export const CONNECTOR_LAYER_ID = 'route-connectors-line';

export function routeSourceId(day: number): string {
  return `route-day-${day}`;
}

export function routeLayerId(day: number): string {
  return `route-line-day-${day}`;
}

export function locatedPois(
  pois: Poi[],
): (Poi & { location: [number, number] })[] {
  return pois.filter((p): p is Poi & { location: [number, number] } =>
    Boolean(p.location),
  );
}

export function poiGeoJson(
  located: (Poi & { location: [number, number] })[],
  options: {
    numbered?: boolean;
    circleColor?: string;
    circleRadius?: number;
  } = {},
): GeoJSON.FeatureCollection {
  const { numbered = false, circleColor, circleRadius } = options;
  return {
    type: 'FeatureCollection',
    features: located.map((poi, idx) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: poi.location,
      },
      properties: {
        id: poi.id,
        name: poi.name,
        category: poi.category,
        notes: poi.notes?.slice(0, 80) ?? '',
        label: numbered ? String(idx + 1) : '',
        circleColor: circleColor ?? '',
        circleRadius: circleRadius ?? 0,
      },
    })),
  };
}

export function straightLineGeometry(
  coords: [number, number][],
): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: coords,
  };
}
