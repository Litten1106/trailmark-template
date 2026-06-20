import { useEffect, useMemo, useState } from 'react';
import { buildJourneyDays } from '../lib/journeyData';
import {
  fetchDayDirections,
  type DayDirectionsResult,
  type DirectionsLeg,
} from '../lib/mapDirections';

import staticRoutes from '../data/routes.json';

const prebuilt = staticRoutes as Record<string, DayDirectionsResult>;

export function useJourneyRoutes() {
  const days = useMemo(() => buildJourneyDays(), []);
  const [routesByDay, setRoutesByDay] = useState<
    Map<number, DayDirectionsResult>
  >(() => {
    const map = new Map<number, DayDirectionsResult>();
    for (const [dayStr, route] of Object.entries(prebuilt)) {
      map.set(Number(dayStr), route);
    }
    return map;
  });
  const [loading, setLoading] = useState(() => Object.keys(prebuilt).length === 0);

  useEffect(() => {
    if (Object.keys(prebuilt).length > 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const map = new Map<number, DayDirectionsResult>();
      for (const dayData of days) {
        if (dayData.coords.length < 2) continue;
        const route = await fetchDayDirections(dayData.coords);
        map.set(dayData.plan.day, route);
      }
      if (!cancelled) {
        setRoutesByDay(map);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  const getLeg = (day: number, legIndex: number): DirectionsLeg | null => {
    const route = routesByDay.get(day);
    if (!route || legIndex < 0 || legIndex >= route.legs.length) return null;
    return route.legs[legIndex];
  };

  return { days, routesByDay, loading, getLeg };
}
