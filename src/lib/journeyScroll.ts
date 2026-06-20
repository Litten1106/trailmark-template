import { scroller } from 'react-scroll';
import type { ActiveDayValue } from './journeyTypes';

export const JOURNEY_SCROLL_CONTAINER_ID = 'journey-scroll-container';

const TAB_ANCHOR_GAP_PX = 6;
const SCROLL_DURATION_MS = 400;
const SCROLL_ALIGN_TOLERANCE_PX = 8;

export function journeyScrollTarget(day: ActiveDayValue): string {
  return day === 'overview' ? 'overview' : `day-${day}`;
}

export function parseScrollTarget(name: string): ActiveDayValue {
  if (name === 'overview') return 'overview';
  const n = Number(name.replace(/^day-/, ''));
  return Number.isFinite(n) ? n : 'overview';
}

export function measureScrollOffset(scrollEl: HTMLElement | null): number {
  if (!scrollEl) return 54;
  const strip = scrollEl.querySelector<HTMLElement>(
    '.journey-vaul-header--sticky',
  );
  return (strip?.offsetHeight ?? 48) + TAB_ANCHOR_GAP_PX;
}

function scrollOptions(smooth: boolean, offset: number) {
  return {
    containerId: JOURNEY_SCROLL_CONTAINER_ID,
    duration: smooth ? SCROLL_DURATION_MS : 0,
    smooth,
    offset: -offset,
    isDynamic: true,
  };
}

/** Scroll offset of `element` relative to `container`'s scrollable content. */
function getScrollTopForElement(
  container: HTMLElement,
  element: HTMLElement,
): number {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return container.scrollTop + (elementRect.top - containerRect.top);
}

function isSectionAlignedWithOffset(
  container: HTMLElement,
  section: HTMLElement,
  offset: number,
): boolean {
  const containerTop = container.getBoundingClientRect().top;
  const sectionTop = section.getBoundingClientRect().top;
  return Math.abs(sectionTop - containerTop - offset) <= SCROLL_ALIGN_TOLERANCE_PX;
}

/**
 * Scroll the journey itinerary container to the section for `day`.
 *
 * Uses getBoundingClientRect (not offsetTop) so nested layout / sticky
 * headers don't skew the target. Returns `true` when the section is laid
 * out and aligned under the sticky date strip; callers should retry while
 * `false` (e.g. Vaul drawer still mounting).
 */
function scrollContainerToDaySection(
  day: number,
  smooth: boolean,
  offset: number,
): boolean {
  const container = document.getElementById(JOURNEY_SCROLL_CONTAINER_ID);
  const section = document.querySelector<HTMLElement>(
    `.journey-day-section[data-day="${day}"]`,
  );
  if (!container || !section) return false;

  // Layout not committed yet (Vaul drawer still mounting / hidden shell).
  if (container.scrollHeight <= container.clientHeight + 1) return false;

  const rawTarget = getScrollTopForElement(container, section) - offset;
  // Day N>1 must sit below the overview block once laid out.
  if (day > 1 && rawTarget < 40) return false;

  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  const clamped = Math.min(Math.max(0, rawTarget), maxScrollTop);

  container.scrollTo({
    top: clamped,
    behavior: smooth ? 'smooth' : 'instant',
  });

  if (smooth) return true;
  return isSectionAlignedWithOffset(container, section, offset);
}

/**
 * Scroll itinerary to a day. Returns `true` only when the scroll was
 * actually applied to a laid-out section; callers should retry while
 * `false`.
 */
export function scrollToJourneyDay(
  day: number,
  smooth = true,
  offset = measureScrollOffset(
    document.getElementById(JOURNEY_SCROLL_CONTAINER_ID),
  ),
): boolean {
  const scrolled = scrollContainerToDaySection(day, smooth, offset);
  if (!scrolled) {
    scroller.scrollTo(journeyScrollTarget(day), scrollOptions(smooth, offset));
  }
  return scrolled;
}

export function scrollToJourneyOverview(
  smooth = true,
  offset = measureScrollOffset(
    document.getElementById(JOURNEY_SCROLL_CONTAINER_ID),
  ),
): void {
  scroller.scrollTo('overview', scrollOptions(smooth, offset));
  const container = document.getElementById(JOURNEY_SCROLL_CONTAINER_ID);
  const overview = container?.querySelector<HTMLElement>(
    '.journey-overview-header',
  );
  if (container && overview) {
    const target = Math.max(0, getScrollTopForElement(container, overview) - offset);
    container.scrollTo({
      top: target,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }
}
