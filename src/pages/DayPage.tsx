import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import JourneyBottomSheet, {
  SHEET_SNAP_DAY,
  SHEET_SNAP_OVERVIEW,
} from '../components/journey/JourneyBottomSheet';
import JourneyTopBar from '../components/journey/JourneyTopBar';
import DateStrip from '../components/journey/DateStrip';
import ItineraryList from '../components/journey/ItineraryList';
import { getAdjacentDay } from '../lib/dayNavigation';
import { parseInitialDay } from '../lib/journeyData';
import {
  measureScrollOffset,
  scrollToJourneyDay,
  scrollToJourneyOverview,
} from '../lib/journeyScroll';
import type { ActiveDayValue } from '../lib/journeyTypes';
import { useJourneyMapContext } from '../context/JourneyMapContext';

const OVERVIEW_UNLOCK_SCROLL_PX = 80;

const DayPage = () => {
  const { day: dayParam } = useParams<{ day: string }>();
  const navigate = useNavigate();

  const {
    days,
    loading,
    getLeg,
    activeDay,
    setActiveDay,
    sheetSnap,
    setSheetSnap,
    triggerCameraAnimate,
    resetCamera,
    refitCamera,
    mainSheetParked,
    selectedPoiId,
    poiDrawerOverlayPx,
  } = useJourneyMapContext();

  const [overviewPinned, setOverviewPinned] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(54);

  // Reset sheet and POI state on every fresh entry into DayPage
  useEffect(() => {
    setSheetSnap(SHEET_SNAP_DAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isUserScrolling = useRef(true);
  const programmaticScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const savedScrollTopRef = useRef(0);

  const applyScrollOffset = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = measureScrollOffset(el);
    setScrollOffset(offset);
    el.style.setProperty('--journey-date-strip-height', `${offset - 6}px`);
  }, []);

  useLayoutEffect(() => {
    applyScrollOffset();
  }, [applyScrollOffset, days.length]);

  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => {
      applyScrollOffset();
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, applyScrollOffset]);

  // Continuously save scrollTop so we can restore it after ItineraryList remounts
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      savedScrollTopRef.current = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // --- Scroll-position-based scroll spy with cooldown ---
  const currentSpyDayRef = useRef<ActiveDayValue>('overview');
  const spyCooldownRef = useRef(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !days.length) return;

    const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
    const itineraryHidden = snap <= 0.33 && !mainSheetParked;
    // Hidden itinerary sections all report offsetTop 0 — spy would always pick the last day.
    if (itineraryHidden || mainSheetParked || selectedPoiId != null) return;

    let rafId = 0;

    const onScroll = () => {
      if (!isUserScrolling.current) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (Date.now() < spyCooldownRef.current) return;

        const scrollTop = container.scrollTop;
        const threshold = scrollTop + scrollOffset;

        const sections = container.querySelectorAll<HTMLElement>(
          '.journey-day-section',
        );

        let detected: ActiveDayValue = 'overview';

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          if (section.offsetTop <= threshold) {
            const dayAttr = section.dataset.day;
            if (dayAttr) {
              const n = Number(dayAttr);
              if (Number.isFinite(n)) detected = n;
            }
          } else {
            break;
          }
        }

        if (detected !== currentSpyDayRef.current) {
          currentSpyDayRef.current = detected;
          spyCooldownRef.current = Date.now() + 200;
          setActiveDay(detected);
        }
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [
    days.length,
    scrollOffset,
    loading,
    setActiveDay,
    sheetSnap,
    mainSheetParked,
    selectedPoiId,
  ]);

  const suppressSpyBriefly = useCallback(() => {
    isUserScrolling.current = false;
    if (programmaticScrollTimer.current) {
      clearTimeout(programmaticScrollTimer.current);
    }
    programmaticScrollTimer.current = setTimeout(() => {
      isUserScrolling.current = true;
    }, 600);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !overviewPinned) return;

    const onScroll = () => {
      if (el.scrollTop > OVERVIEW_UNLOCK_SCROLL_PX) {
        setOverviewPinned(false);
        setSheetSnap(SHEET_SNAP_DAY);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [overviewPinned, setSheetSnap]);

  // When at min snap, intercept upward swipe to expand sheet instead of scrolling content
  const touchStartYRef = useRef<number>(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
      if (snap > 0.33) return; // only intercept at min snap
      const deltaY = touchStartYRef.current - e.touches[0].clientY;
      if (deltaY > 8) {
        // upward swipe at min snap → expand to half
        e.preventDefault();
        setSheetSnap(0.55);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [sheetSnap, setSheetSnap]);

  const prevDayParamRef = useRef<string | undefined>(undefined);
  const didInitialScroll = useRef(false);
  useLayoutEffect(() => {
    const paramChanged = dayParam !== prevDayParamRef.current;
    if (paramChanged) {
      prevDayParamRef.current = dayParam;
      didInitialScroll.current = false;
    }

    if (didInitialScroll.current) return;
    if (loading || !days.length) return;

    const initial = parseInitialDay(dayParam);

    if (initial === 'overview') {
      didInitialScroll.current = true;
      return;
    }

    setOverviewPinned(false);
    suppressSpyBriefly();
    resetCamera();
    setActiveDay(initial);
    triggerCameraAnimate();
    refitCamera();

    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId = 0;
    let cancelled = false;

    const finish = () => {
      if (!cancelled) didInitialScroll.current = true;
    };

    const tryScrollToDay = () => {
      if (cancelled) return;
      const freshOffset = measureScrollOffset(scrollRef.current);
      const scrolled = scrollToJourneyDay(initial, false, freshOffset);
      if (scrolled) {
        finish();
        return;
      }
      if (attempts < 30) {
        attempts += 1;
        retryTimer = setTimeout(tryScrollToDay, 50);
        return;
      }
      finish();
    };

    // Wait for Vaul drawer + itinerary layout before scrolling.
    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        retryTimer = setTimeout(tryScrollToDay, 80);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [
    dayParam,
    loading,
    days.length,
    suppressSpyBriefly,
    setActiveDay,
    triggerCameraAnimate,
    resetCamera,
    refitCamera,
  ]);

  const selectDayFromTab = useCallback(
    (day: number) => {
      setOverviewPinned(false);
      const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
      if (snap > 0.33) setSheetSnap(SHEET_SNAP_DAY);
      resetCamera();
      setActiveDay(day);
      triggerCameraAnimate();
      suppressSpyBriefly();
      navigate(`/day/${day}`, { replace: true });
    },
    [
      navigate,
      suppressSpyBriefly,
      sheetSnap,
      setSheetSnap,
      resetCamera,
      setActiveDay,
      triggerCameraAnimate,
    ],
  );

  const goToDayFromSwipe = useCallback(
    (day: number) => {
      setOverviewPinned(false);
      const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
      if (snap > 0.33) setSheetSnap(SHEET_SNAP_DAY);
      resetCamera();
      setActiveDay(day);
      triggerCameraAnimate();
      suppressSpyBriefly();
      scrollToJourneyDay(day, true, scrollOffset);
      navigate(`/day/${day}`, { replace: true });
    },
    [
      navigate,
      scrollOffset,
      suppressSpyBriefly,
      sheetSnap,
      setSheetSnap,
      resetCamera,
      setActiveDay,
      triggerCameraAnimate,
    ],
  );

  const handleOverview = useCallback(() => {
    setOverviewPinned(true);
    const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
    if (snap > 0.33) setSheetSnap(SHEET_SNAP_OVERVIEW);
    resetCamera();
    setActiveDay('overview');
    triggerCameraAnimate();
    suppressSpyBriefly();
    navigate('/day/overview', { replace: true });
  }, [
    navigate,
    suppressSpyBriefly,
    sheetSnap,
    setSheetSnap,
    resetCamera,
    setActiveDay,
    triggerCameraAnimate,
  ]);

  const handleOverviewFromSwipe = useCallback(() => {
    setOverviewPinned(true);
    const snap = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
    if (snap > 0.33) setSheetSnap(SHEET_SNAP_OVERVIEW);
    resetCamera();
    setActiveDay('overview');
    triggerCameraAnimate();
    suppressSpyBriefly();
    scrollToJourneyOverview(true, scrollOffset);
    navigate('/day/overview', { replace: true });
  }, [
    navigate,
    scrollOffset,
    suppressSpyBriefly,
    sheetSnap,
    setSheetSnap,
    resetCamera,
    setActiveDay,
    triggerCameraAnimate,
  ]);

  const handleAdjacentDay = useCallback(
    (direction: 'prev' | 'next') => {
      const next = getAdjacentDay(days, activeDay, direction);
      if (next == null) return;

      if (next === 'overview') {
        handleOverviewFromSwipe();
        return;
      }

      goToDayFromSwipe(next);
    },
    [activeDay, days, goToDayFromSwipe, handleOverviewFromSwipe],
  );

  const dayExists = days.some((d) => d.plan.day === Number(dayParam));
  if (dayParam && !dayExists && dayParam !== 'overview') {
    return (
      <div className="px-5 py-10">
        <p style={{ color: 'var(--text-secondary)' }}>
          没找到 Day {dayParam}。
        </p>
        <Link to="/" className="underline" style={{ color: 'var(--green)' }}>
          ← 回到行程列表
        </Link>
      </div>
    );
  }

  const snapFraction = typeof sheetSnap === 'number' ? sheetSnap : 0.55;
  const itineraryHidden = snapFraction <= 0.33 && !mainSheetParked;
  const locateBottom =
    selectedPoiId != null && poiDrawerOverlayPx != null
      ? `${poiDrawerOverlayPx + 12}px`
      : `calc(${snapFraction * 100}dvh + 12px)`;

  // Restore scroll position when returning from min-snap (e.g. closing POI detail)
  useEffect(() => {
    if (snapFraction > 0.33 && savedScrollTopRef.current > 0) {
      suppressSpyBriefly();
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = savedScrollTopRef.current;
          savedScrollTopRef.current = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [snapFraction, suppressSpyBriefly]);

  return (
    <div className="journey-page">
      <JourneyTopBar />
      <button
        className="journey-locate-btn"
        style={{ bottom: locateBottom }}
        onClick={refitCamera}
        aria-label="定位到当前行程"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="3.5" fill="currentColor" />
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="10"
            y1="1"
            x2="10"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="16"
            x2="10"
            y2="19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="1"
            y1="10"
            x2="4"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="10"
            x2="19"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <JourneyBottomSheet
        scrollRef={scrollRef}
        activeSnapPoint={sheetSnap}
        onSnapChange={setSheetSnap}
        parked={mainSheetParked}
        header={
          <DateStrip
            days={days}
            activeDay={activeDay}
            scrollOffset={scrollOffset}
            isMinSnap={snapFraction <= 0.33}
            onOverview={handleOverview}
            onSelectDay={selectDayFromTab}
            onAdjacentDay={handleAdjacentDay}
          />
        }
      >
        <div
          className={`journey-itinerary-shell${
            itineraryHidden ? ' journey-itinerary-shell--hidden' : ''
          }`}
        >
          <ItineraryList days={days} getLeg={getLeg} routesLoading={loading} />
        </div>
      </JourneyBottomSheet>
    </div>
  );
};

export default DayPage;
