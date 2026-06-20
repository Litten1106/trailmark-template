import { useCallback } from 'react';
import { itinerary } from '../data/itinerary';

const STORAGE_KEY = 'iceland-roadbook-done';

function loadDone(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getPoiIdsForDay(day: number): string[] {
  const d = itinerary.days.find((x) => x.day === day);
  return d ? d.poiIds : [];
}

export function useProgress() {
  const allDone = loadDone();

  const togglePoi = useCallback((poiId: string): void => {
    const current = loadDone();
    current[poiId] = !current[poiId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('iceland-progress-changed'));
  }, []);

  const isDayDone = useCallback(
    (day: number): boolean => {
      const poiIds = getPoiIdsForDay(day);
      return poiIds.length > 0 && poiIds.every((id) => allDone[id]);
    },
    [allDone],
  );

  const dayStats = useCallback(
    (day: number): { total: number; done: number } => {
      const poiIds = getPoiIdsForDay(day);
      const done = poiIds.filter((id) => allDone[id]).length;
      return { total: poiIds.length, done };
    },
    [allDone],
  );

  return { allDone, togglePoi, isDayDone, dayStats };
}
