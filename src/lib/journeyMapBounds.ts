import mapboxgl from 'mapbox-gl';
import {
  getTripBounds,
  getTripCenter,
  DEFAULT_ZOOM,
} from './map';
import type { DayDirectionsResult } from './mapDirections';
import type { JourneyDayData } from './journeyData';
import type { ActiveDayValue } from './journeyTypes';

const BOUNDS_EXPAND_RATIO = 0.08;
const MIN_BOUNDS_SPAN_DEG = 0.06;

const OVERVIEW_MAX_ZOOM = 9;
const DAY_MAX_ZOOM = 12;

/** Space below fitted bounds for circle + number label inside the visible band. */
const MARKER_LABEL_MARGIN_PX = 36;
const TOPBAR_PADDING_PX = 64;

/** Lowest journey sheet snap (matches JourneyBottomSheet). */
export const SHEET_SNAP_MIN = 0.3;
export const SHEET_SNAP_DAY_DEFAULT = 0.55;

/**
 * Fit bounds into the map band above the Vaul sheet.
 * Padding alone defines the visible rectangle — no extra offset (offset + padding was pushing POIs too high).
 */
export function getViewportFitOptions(
  sheetSnapFraction: number,
  isOverview: boolean,
): {
  padding: { top: number; bottom: number; left: number; right: number };
  offset: [number, number];
  maxZoom: number;
} {
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const snap = Math.min(0.88, Math.max(SHEET_SNAP_MIN, sheetSnapFraction));
  const top = isOverview ? 52 : TOPBAR_PADDING_PX;
  const bottom = Math.round(h * snap) + MARKER_LABEL_MARGIN_PX;

  return {
    padding: {
      top,
      bottom,
      left: isOverview ? 36 : 40,
      right: isOverview ? 36 : 40,
    },
    offset: [0, 0],
    maxZoom: isOverview ? OVERVIEW_MAX_ZOOM : DAY_MAX_ZOOM,
  };
}

let lastCameraKey: string | null = null;

/** Expand bounds so start/end POIs stay inside the viewport with margin. */
export function expandBounds(
  bounds: mapboxgl.LngLatBounds,
  ratio = BOUNDS_EXPAND_RATIO,
): mapboxgl.LngLatBounds {
  const center = bounds.getCenter();
  let lngSpan = bounds.getEast() - bounds.getWest();
  let latSpan = bounds.getNorth() - bounds.getSouth();

  lngSpan = Math.max(lngSpan, MIN_BOUNDS_SPAN_DEG) * (1 + ratio);
  latSpan = Math.max(latSpan, MIN_BOUNDS_SPAN_DEG) * (1 + ratio);

  return new mapboxgl.LngLatBounds(
    [center.lng - lngSpan / 2, center.lat - latSpan / 2],
    [center.lng + lngSpan / 2, center.lat + latSpan / 2],
  );
}

/** One-time trip bounds warm-up on map load (no animation). */
export function bootstrapTripMap(map: mapboxgl.Map): void {
  const bounds = getTripBounds();
  if (bounds) {
    map.fitBounds(bounds, {
      padding: 40,
      maxZoom: 12,
      duration: 0,
      essential: true,
    });
    return;
  }
  const center = getTripCenter();
  map.setCenter(center);
  map.setZoom(DEFAULT_ZOOM);
}

export function buildBoundsForDay(
  dayData: JourneyDayData | undefined,
  route?: DayDirectionsResult,
): mapboxgl.LngLatBounds | null {
  if (!dayData || dayData.located.length === 0) return null;

  const bounds = new mapboxgl.LngLatBounds();
  route?.geometry.coordinates.forEach((c) =>
    bounds.extend(c as [number, number]),
  );
  dayData.located.forEach((p) => bounds.extend(p.location));
  return bounds;
}

/** Overview bounds include all driving route geometry + POIs. */
export function buildOverviewBounds(
  days: JourneyDayData[],
  routesByDay: Map<number, DayDirectionsResult>,
): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();
  let hasPoint = false;

  const seenPoi = new Set<string>();
  for (const { plan, located } of days) {
    const route = routesByDay.get(plan.day);
    route?.geometry.coordinates.forEach((c) => {
      bounds.extend(c as [number, number]);
      hasPoint = true;
    });
    for (const p of located) {
      if (seenPoi.has(p.id)) continue;
      seenPoi.add(p.id);
      bounds.extend(p.location);
      hasPoint = true;
    }
  }

  return hasPoint ? bounds : null;
}

function cameraKey(
  activeDay: ActiveDayValue,
  sheetSnapFraction: number,
): string {
  const snap = sheetSnapFraction.toFixed(2);
  return activeDay === 'overview'
    ? `overview@${snap}`
    : `day-${activeDay}@${snap}`;
}

export function resetMapCameraCache(): void {
  lastCameraKey = null;
}

export function fitMapToActiveDay(
  map: mapboxgl.Map,
  days: JourneyDayData[],
  activeDay: ActiveDayValue,
  routesByDay: Map<number, DayDirectionsResult>,
  animate = true,
  force = false,
  sheetSnapFraction = SHEET_SNAP_DAY_DEFAULT,
): void {
  const key = cameraKey(activeDay, sheetSnapFraction);
  if (!force && key === lastCameraKey) return;

  const isOverview = activeDay === 'overview';
  let bounds: mapboxgl.LngLatBounds | null = null;

  if (isOverview) {
    bounds = buildOverviewBounds(days, routesByDay);
  } else {
    const dayData = days.find((d) => d.plan.day === activeDay);
    bounds = buildBoundsForDay(dayData, routesByDay.get(activeDay));
  }

  if (!bounds) {
    map.setCenter(getTripCenter());
    map.setZoom(DEFAULT_ZOOM);
    lastCameraKey = key;
    return;
  }

  const expanded = expandBounds(bounds, isOverview ? 0.1 : BOUNDS_EXPAND_RATIO);
  const fit = getViewportFitOptions(sheetSnapFraction, isOverview);

  map.fitBounds(expanded, {
    padding: fit.padding,
    offset: fit.offset,
    maxZoom: fit.maxZoom,
    duration: animate ? 320 : 0,
    essential: true,
  });

  lastCameraKey = key;
}
