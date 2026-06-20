import type { JourneyDayData } from './journeyData';
import type { ActiveDayValue } from './journeyTypes';

export function buildDayOrder(days: JourneyDayData[]): ActiveDayValue[] {
  return ['overview', ...days.map((d) => d.plan.day)];
}

export function getAdjacentDay(
  days: JourneyDayData[],
  current: ActiveDayValue,
  direction: 'prev' | 'next',
): ActiveDayValue | null {
  const order = buildDayOrder(days);
  const idx = order.indexOf(current);
  if (idx === -1) return null;
  const nextIdx = idx + (direction === 'next' ? 1 : -1);
  if (nextIdx < 0 || nextIdx >= order.length) return null;
  return order[nextIdx] ?? null;
}
