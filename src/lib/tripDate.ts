import type { DayPlan } from '../data/types';

/** Local calendar date as YYYY-MM-DD. */
export function toLocalYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Index of the trip day card to center on home:
 * first day whose date is still today or in the future; else last day.
 */
export function getDefaultCarouselIndex(
  days: DayPlan[],
  now = new Date(),
): number {
  if (days.length === 0) return 0;

  const today = toLocalYmd(now);
  const upcoming = days.findIndex((d) => d.date >= today);
  if (upcoming !== -1) return upcoming;

  return days.length - 1;
}

/** Day number for /day route from today's local date. */
export function getDefaultTripDay(days: DayPlan[], now = new Date()): number {
  const index = getDefaultCarouselIndex(days, now);
  return days[index]?.day ?? days[0].day;
}
