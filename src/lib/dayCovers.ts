import { itinerary } from '../data/itinerary';

/** Day hero / cover images — from day.photos[0] or gradient placeholder. */
export function coverForDay(day: number): string | undefined {
  const plan = itinerary.days.find((d) => d.day === day);
  return plan?.photos?.[0];
}

export function coverForActiveDay(activeDay: number | 'overview'): string {
  if (activeDay === 'overview') {
    const first = itinerary.days[0]?.photos?.[0];
    return first ?? '';
  }
  return coverForDay(activeDay) ?? '';
}

/** @deprecated Use coverForDay — legacy map for components still importing DAY_COVERS */
export const DAY_COVERS: Record<number, string> = Object.fromEntries(
  itinerary.days
    .filter((d) => d.photos?.[0])
    .map((d) => [d.day, d.photos![0]]),
);

export const JOURNEY_OVERVIEW_COVER =
  itinerary.days[0]?.photos?.[0] ?? '';
