import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import type { DayDirectionsResult } from './mapDirections';
import { buildOverviewOrderedStops, type JourneyDayData } from './journeyData';
import {
  poiGeoJson,
  POI_CIRCLE_LAYER_ID,
  POI_LABEL_LAYER_ID,
  POI_LODGING_LABEL_LAYER_ID,
  POI_LODGING_LAYER_ID,
  LODGING_PIN_IMAGE_ID,
  POI_SOURCE_ID,
  CONNECTOR_SOURCE_ID,
  CONNECTOR_LAYER_ID,
  routeLayerId,
  routeSourceId,
} from './mapLayers';
import type { ActiveDayValue } from './journeyTypes';
import { fitMapToActiveDay } from './journeyMapBounds';

const JOURNEY_BLUE = '#4A9EF5';
const JOURNEY_GRAY = '#94a3b8';
const LODGING_PURPLE = '#8b5cf6';
const CONNECTOR_COLOR = '#ffffff';

const LODGING_FILTER = ['==', ['get', 'category'], 'lodging'] as const;
const SIGHT_FILTER = ['!=', ['get', 'category'], 'lodging'] as const;

function ensureLodgingPinImage(map: MapboxMap): void {
  if (map.hasImage(LODGING_PIN_IMAGE_ID)) return;

  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(24, 24, 20, 0, Math.PI * 2);
  ctx.fillStyle = LODGING_PURPLE;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 26, 24, 7);
  ctx.fillRect(12, 20, 6, 13);
  ctx.fillRect(30, 20, 6, 13);

  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(LODGING_PIN_IMAGE_ID, imageData, { pixelRatio: 2 });
}

/** Distinct route colour for each day (cycles for trips >12 days). */
const DAY_ROUTE_COLORS: string[] = [
  '#4A9EF5', // 0 → Day 1  蓝
  '#8B5CF6', // 1 → Day 2  紫
  '#10B981', // 2 → Day 3  绿
  '#F59E0B', // 3 → Day 4  橙
  '#EF4444', // 4 → Day 5  红
  '#EC4899', // 5 → Day 6  粉
  '#06B6D4', // 6 → Day 7  青
  '#84CC16', // 7 → Day 8  柠
  '#F97316', // 8 → Day 9  橘
  '#6366F1', // 9 → Day 10 靛
  '#14B8A6', // 10→ Day 11  teal
  '#D946EF', // 11→ Day 12  洋红
];

function getDayRouteColor(day: number): string {
  return DAY_ROUTE_COLORS[(day - 1) % DAY_ROUTE_COLORS.length];
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

function routeHasLine(route: DayDirectionsResult | undefined): boolean {
  return (route?.geometry.coordinates.length ?? 0) >= 2;
}

/** Straight-line connectors between consecutive day endpoints (day N end → day N+1 start). */
function buildConnectorGeoJson(
  days: JourneyDayData[],
  routesByDay: Map<number, DayDirectionsResult>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const sorted = [...days].sort((a, b) => a.plan.day - b.plan.day);

  for (let i = 0; i < sorted.length - 1; i++) {
    const routeA = routesByDay.get(sorted[i].plan.day);
    const routeB = routesByDay.get(sorted[i + 1].plan.day);
    if (!routeHasLine(routeA) || !routeHasLine(routeB)) continue;

    const coordsA = routeA!.geometry.coordinates;
    const coordsB = routeB!.geometry.coordinates;
    const endA = coordsA[coordsA.length - 1] as [number, number];
    const startB = coordsB[0] as [number, number];

    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [endA, startB] },
    });
  }

  return { type: 'FeatureCollection', features };
}

function syncRouteSources(
  map: MapboxMap,
  days: JourneyDayData[],
  routesByDay: Map<number, DayDirectionsResult>,
): void {
  for (const { plan } of days) {
    const route = routesByDay.get(plan.day);
    if (!routeHasLine(route)) continue;

    const sid = routeSourceId(plan.day);
    const data: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: route!.geometry,
    };

    const existing = map.getSource(sid) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
    }
  }
}

export function ensureJourneyMapLayers(
  map: MapboxMap,
  days: JourneyDayData[],
  routesByDay: Map<number, DayDirectionsResult>,
): void {
  for (const { plan } of days) {
    const sid = routeSourceId(plan.day);
    const lid = routeLayerId(plan.day);
    const route = routesByDay.get(plan.day);

    if (!routeHasLine(route)) continue;

    if (!map.getSource(sid)) {
      map.addSource(sid, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: route!.geometry },
      });
    }

    if (!map.getLayer(lid)) {
      map.addLayer({
        id: lid,
        type: 'line',
        source: sid,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'none',
        },
        paint: {
          'line-color': JOURNEY_BLUE,
          'line-width': 3,
          'line-opacity': 0.7,
        },
      });
    }
  }

  // Connector source + dashed layer (day-end → next-day-start)
  if (!map.getSource(CONNECTOR_SOURCE_ID)) {
    map.addSource(CONNECTOR_SOURCE_ID, {
      type: 'geojson',
      data: buildConnectorGeoJson(days, routesByDay),
    });
  }

  if (!map.getLayer(CONNECTOR_LAYER_ID)) {
    map.addLayer({
      id: CONNECTOR_LAYER_ID,
      type: 'line',
      source: CONNECTOR_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'butt', visibility: 'none' },
      paint: {
        'line-color': CONNECTOR_COLOR,
        'line-width': 2,
        'line-opacity': 0.7,
        'line-dasharray': [2, 3],
      },
    });
  }

  if (!map.getSource(POI_SOURCE_ID)) {
    map.addSource(POI_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
  }

  ensureLodgingPinImage(map);

  if (!map.getLayer(POI_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: POI_CIRCLE_LAYER_ID,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: SIGHT_FILTER,
      paint: {
        'circle-radius': 10,
        'circle-color': JOURNEY_GRAY,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  if (!map.getLayer(POI_LABEL_LAYER_ID)) {
    map.addLayer({
      id: POI_LABEL_LAYER_ID,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: SIGHT_FILTER,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 13,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        visibility: 'none',
      },
      paint: { 'text-color': '#ffffff' },
    });
  }

  if (!map.getLayer(POI_LODGING_LAYER_ID)) {
    map.addLayer({
      id: POI_LODGING_LAYER_ID,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: LODGING_FILTER,
      layout: {
        'icon-image': LODGING_PIN_IMAGE_ID,
        'icon-size': 0.85,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
  }

  if (!map.getLayer(POI_LODGING_LABEL_LAYER_ID)) {
    map.addLayer({
      id: POI_LODGING_LABEL_LAYER_ID,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: LODGING_FILTER,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 0.2],
        'text-allow-overlap': true,
        visibility: 'none',
      },
      paint: { 'text-color': '#ffffff' },
    });
  }

  syncRouteSources(map, days, routesByDay);
}

export function updateJourneyMapForActiveDay(
  map: MapboxMap,
  days: JourneyDayData[],
  activeDay: ActiveDayValue,
  routesByDay: Map<number, DayDirectionsResult>,
  animateCamera = true,
  sheetSnapFraction?: number,
  force = false,
): void {
  ensureJourneyMapLayers(map, days, routesByDay);

  const isOverview = activeDay === 'overview';
  const activeDayData = isOverview
    ? null
    : days.find((d) => d.plan.day === activeDay);

  for (const { plan } of days) {
    const lid = routeLayerId(plan.day);
    if (!map.getLayer(lid)) continue;

    const route = routesByDay.get(plan.day);
    if (!routeHasLine(route)) {
      map.setLayoutProperty(lid, 'visibility', 'none');
      continue;
    }

    const isActive = !isOverview && activeDayData?.plan.day === plan.day;
    const show = isOverview || isActive;
    const dayColor = getDayRouteColor(plan.day);

    map.setLayoutProperty(lid, 'visibility', show ? 'visible' : 'none');
    if (show) {
      map.setPaintProperty(lid, 'line-color', dayColor);
      map.setPaintProperty(lid, 'line-width', isActive ? 4 : 3);
      map.setPaintProperty(lid, 'line-opacity', isActive ? 1 : 0.75);
    }
  }

  // Connector dashes only in overview
  if (map.getLayer(CONNECTOR_LAYER_ID)) {
    map.setLayoutProperty(
      CONNECTOR_LAYER_ID,
      'visibility',
      isOverview ? 'visible' : 'none',
    );
  }

  const located = isOverview
    ? buildOverviewOrderedStops(days)
    : (activeDayData?.located ?? []);

  const poiSource = map.getSource(POI_SOURCE_ID) as GeoJSONSource | undefined;
  if (poiSource) {
    poiSource.setData(
      located.length > 0 ? poiGeoJson(located, { numbered: true }) : EMPTY_FC,
    );
  }

  if (map.getLayer(POI_CIRCLE_LAYER_ID)) {
    map.setPaintProperty(
      POI_CIRCLE_LAYER_ID,
      'circle-radius',
      isOverview ? 12 : 14,
    );
    map.setPaintProperty(POI_CIRCLE_LAYER_ID, 'circle-color', JOURNEY_BLUE);
  }

  if (map.getLayer(POI_LABEL_LAYER_ID)) {
    map.setLayoutProperty(POI_LABEL_LAYER_ID, 'visibility', 'visible');
    map.setPaintProperty(POI_LABEL_LAYER_ID, 'text-color', '#ffffff');
  }

  if (map.getLayer(POI_LODGING_LABEL_LAYER_ID)) {
    map.setLayoutProperty(POI_LODGING_LABEL_LAYER_ID, 'visibility', 'visible');
    map.setPaintProperty(POI_LODGING_LABEL_LAYER_ID, 'text-color', '#ffffff');
  }

  fitMapToActiveDay(
    map,
    days,
    activeDay,
    routesByDay,
    animateCamera,
    force,
    sheetSnapFraction,
  );
}
