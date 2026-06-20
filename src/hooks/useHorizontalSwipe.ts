import { useEffect, type RefObject } from 'react';

const SWIPE_THRESHOLD_PX = 52;
const SCROLL_GUARD_PX = 8;

/**
 * Detect horizontal swipe on a touch target (prev = swipe right, next = swipe left).
 * If `scrollRef` moved horizontally during the gesture, treat it as scrolling tabs, not a day change.
 */
export function useHorizontalSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: 'prev' | 'next') => void,
  enabled = true,
  scrollRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = scrollRef?.current?.scrollLeft ?? 0;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;

      const scrolled =
        scrollRef?.current != null &&
        Math.abs(scrollRef.current.scrollLeft - startScrollLeft) >
          SCROLL_GUARD_PX;
      if (scrolled) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (
        Math.abs(dx) < SWIPE_THRESHOLD_PX ||
        Math.abs(dx) <= Math.abs(dy) * 1.2
      )
        return;
      onSwipe(dx < 0 ? 'next' : 'prev');
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ref, scrollRef, onSwipe, enabled]);
}
