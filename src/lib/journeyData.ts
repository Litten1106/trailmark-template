import { itinerary } from '../data/itinerary';
import type { DayPlan, Poi } from '../data/types';
import { locatedPois } from './mapLayers';

export interface JourneyDayData {
  plan: DayPlan;
  stops: Poi[];
  located: (Poi & { location: [number, number] })[];
  coords: [number, number][];
}

export function buildJourneyDays(): JourneyDayData[] {
  const poiById = new Map(itinerary.pois.map((p) => [p.id, p]));

  return itinerary.days.map((plan) => {
    const stops = plan.poiIds
      .map((id) => poiById.get(id))
      .filter((p): p is Poi => Boolean(p));
    const located = locatedPois(stops);
    return {
      plan,
      stops,
      located,
      coords: located.map((p) => p.location),
    };
  });
}

/** All trip stops in visit order (day 1 → N, poi order within day); first occurrence wins. */
export function buildOverviewOrderedStops(
  days: JourneyDayData[],
): (Poi & { location: [number, number] })[] {
  const seen = new Set<string>();
  const ordered: (Poi & { location: [number, number] })[] = [];

  for (const { located } of days) {
    for (const poi of located) {
      if (seen.has(poi.id)) continue;
      seen.add(poi.id);
      ordered.push(poi);
    }
  }

  return ordered;
}

export function parseInitialDay(
  dayParam: string | undefined,
): number | 'overview' {
  const n = Number(dayParam);
  if (!Number.isFinite(n) || n < 1) return 'overview';
  const exists = itinerary.days.some((d) => d.day === n);
  return exists ? n : 'overview';
}
