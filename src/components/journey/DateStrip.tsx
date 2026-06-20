import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import type { JourneyDayData } from '../../lib/journeyData';
import {
  scrollToJourneyDay,
  scrollToJourneyOverview,
} from '../../lib/journeyScroll';
import type { ActiveDayValue } from '../../lib/journeyTypes';
import { formatDayTabLabel, formatVisitWindow } from '../../lib/visitTime';
import { formatLegDistance, formatLegDuration } from '../../lib/mapDirections';
import { useHorizontalSwipe } from '../../hooks/useHorizontalSwipe';
import { useJourneyMapContext } from '../../context/JourneyMapContext';
import type { Poi } from '../../data/types';
import LazyImage from '../LazyImage';
import 'swiper/css';

const categoryLabel: Record<Poi['category'], string> = {
  sight: '景点',
  food: '就餐',
  lodging: '住宿',
  drive: '驾驶',
  experience: '体验',
  transit: '交通',
};

/** Soft pastels per day for POI cards. */
const dayCardColors: Record<number, string> = {
  1: '#E8F4FD', // 淡蓝
  2: '#F0E8F8', // 淡紫
  3: '#E8F8F0', // 淡绿
  4: '#FDF0E8', // 淡橙
  5: '#F8E8E8', // 淡粉
  6: '#F8F4E8', // 淡黄
};

function getDayCardColor(dayNumber: number): string {
  return dayCardColors[dayNumber] ?? '#ffffff';
}

interface DateStripProps {
  days: JourneyDayData[];
  activeDay: ActiveDayValue;
  scrollOffset: number;
  isMinSnap?: boolean;
  onOverview: () => void;
  onSelectDay: (day: number) => void;
  onAdjacentDay: (direction: 'prev' | 'next') => void;
}

/** Flat list of all POIs across all days, in visit order. */
interface FlatPoi {
  poi: Poi;
  dayNumber: number;
  poiIndexInDay: number;  // 0-based within that day's stops
  dayStopCount: number;   // total stops in that day
  globalIndex: number;    // 0-based across all days
}

function buildFlatPois(days: JourneyDayData[]): FlatPoi[] {
  const flat: FlatPoi[] = [];
  for (const { plan, stops } of days) {
    for (let i = 0; i < stops.length; i++) {
      flat.push({
        poi: stops[i],
        dayNumber: plan.day,
        poiIndexInDay: i,
        dayStopCount: stops.length,
        globalIndex: flat.length,
      });
    }
  }
  return flat;
}

const DateStrip = ({
  days,
  activeDay,
  scrollOffset,
  isMinSnap = false,
  onOverview,
  onSelectDay,
  onAdjacentDay,
}: DateStripProps) => {
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const { setActivePoiIndex, setActiveDay, getLeg, setSelectedPoiId, selectedPoiId, activePoiIndex } = useJourneyMapContext();
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const swiperDrivingRef = useRef(false);
  const poiDrivingRef = useRef(false);
  const activeDayRef = useRef(activeDay);

  useEffect(() => {
    activeDayRef.current = activeDay;
  }, [activeDay]);

  const allPois = useMemo(() => buildFlatPois(days), [days]);

  const handleSwipe = useCallback(
    (direction: 'prev' | 'next') => onAdjacentDay(direction),
    [onAdjacentDay],
  );

  useHorizontalSwipe(swipeRef, handleSwipe, !isMinSnap, trackRef);

  // Scroll active tab into center when activeDay changes or carousel re-appears
  useEffect(() => {
    if (activeDay === 'overview') return;
    const tab = tabRefs.current.get(activeDay);
    const track = trackRef.current;
    if (!tab || !track) return;
    const trackRect = track.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const targetScroll =
      track.scrollLeft + (tabRect.left + tabRect.width / 2) - (trackRect.left + trackRect.width / 2);
    track.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [activeDay, days.length, isMinSnap]);

  // When leaving min-snap, clear POI highlight
  useEffect(() => {
    if (!isMinSnap) setActivePoiIndex(null);
  }, [isMinSnap, setActivePoiIndex]);

  // Sync Swiper to activePoiIndex/activeDay when carousel re-appears or tab is clicked
  useEffect(() => {
    if (!isMinSnap || activeDay === 'overview' || !swiperInstance) return;
    if (swiperDrivingRef.current) {
      swiperDrivingRef.current = false;
      return;
    }
    if (poiDrivingRef.current) {
      poiDrivingRef.current = false;
      return;
    }
    // Prefer activePoiIndex so we restore the exact slide after closing detail drawer
    let targetIndex = -1;
    if (activePoiIndex != null) {
      targetIndex = allPois.findIndex(
        (p) => p.dayNumber === activeDay && p.poiIndexInDay === activePoiIndex,
      );
    }
    if (targetIndex < 0) {
      targetIndex = allPois.findIndex((p) => p.dayNumber === activeDay);
    }
    if (targetIndex >= 0) {
      const targetPoi = allPois[targetIndex];
      if (targetPoi) setActivePoiIndex(targetPoi.poiIndexInDay);
      if (targetIndex !== swiperInstance.activeIndex) {
        poiDrivingRef.current = true;
        swiperInstance.slideTo(targetIndex, 0);
      }
      setActiveSlideIndex(targetIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinSnap, activeDay, swiperInstance, activePoiIndex, allPois]);

  const handleTabClick = useCallback(
    (day: number) => {
      scrollToJourneyDay(day, true, scrollOffset);
      onSelectDay(day);
    },
    [scrollOffset, onSelectDay],
  );

  const handleOverviewClick = useCallback(() => {
    scrollToJourneyOverview(true, scrollOffset);
    onOverview();
  }, [scrollOffset, onOverview]);

  const activePoi = isMinSnap ? allPois[activeSlideIndex] : null;

  // Previous leg: commute to reach current POI
  let prevCommuteText: string | null = null;
  if (activePoi && activePoi.poiIndexInDay > 0) {
    const prevLeg = getLeg(activePoi.dayNumber, activePoi.poiIndexInDay - 1);
    if (prevLeg) {
      const km = prevLeg.distanceM / 1000;
      const isWalking = prevLeg.distanceM < 800;
      const mode = isWalking ? '🚶 步行' : '🚗 驾车';
      const dist = formatLegDistance(km);
      const dur = formatLegDuration(prevLeg.durationS);
      prevCommuteText = `${mode} ${dist} ${dur}`;
    }
  }

  // Next leg: commute from current POI to next
  let nextCommuteText: string | null = null;
  if (activePoi && activePoi.poiIndexInDay < activePoi.dayStopCount - 1) {
    const nextLeg = getLeg(activePoi.dayNumber, activePoi.poiIndexInDay);
    if (nextLeg) {
      const km = nextLeg.distanceM / 1000;
      const isWalking = nextLeg.distanceM < 800;
      const mode = isWalking ? '🚶 步行' : '🚗 驾车';
      const dist = formatLegDistance(km);
      const dur = formatLegDuration(nextLeg.durationS);
      nextCommuteText = `${mode} ${dist} ${dur}`;
    }
  }

  return (
    <>
      {/* Date tab strip -- always visible */}
      <div className="journey-date-strip" ref={swipeRef}>
        <button
          type="button"
          className={`journey-date-tab journey-date-tab--overview ${activeDay === 'overview' ? 'journey-date-tab--active' : ''}`}
          onClick={handleOverviewClick}
        >
          总览
        </button>
        <div className="journey-date-strip__track" ref={trackRef}>
          {days.map(({ plan }) => (
            <button
              key={plan.day}
              type="button"
              ref={(el) => {
                if (el) tabRefs.current.set(plan.day, el);
                else tabRefs.current.delete(plan.day);
              }}
              className={`journey-date-tab ${activeDay === plan.day ? 'journey-date-tab--active' : ''}`}
              aria-current={activeDay === plan.day ? 'true' : undefined}
              onClick={() => handleTabClick(plan.day)}
            >
              {formatDayTabLabel(plan.date)}
            </button>
          ))}
        </div>
      </div>

      {/* Min-snap POI carousel — hidden when POI detail drawer is open */}
      {isMinSnap && !selectedPoiId && (
        <div className="journey-poi-strip">
          <Swiper
            slidesPerView="auto"
            centeredSlides={true}
            spaceBetween={12}
            touchStartPreventDefault={false}
            touchMoveStopPropagation={true}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => {
              const wasProgrammatic = poiDrivingRef.current;
              poiDrivingRef.current = false;

              const idx = swiper.activeIndex;
              setActiveSlideIndex(idx);
              const poi = allPois[idx];
              if (poi) {
                setActivePoiIndex(poi.poiIndexInDay);
                if (
                  !wasProgrammatic &&
                  activeDayRef.current !== poi.dayNumber
                ) {
                  swiperDrivingRef.current = true;
                  setActiveDay(poi.dayNumber);
                }
              }
            }}
            className="journey-poi-swiper"
          >
            {allPois.length === 0 && (
              <SwiperSlide className="journey-poi-slide">
                <div className="journey-poi-strip__empty">暂无景点</div>
              </SwiperSlide>
            )}
            {allPois.map(({ poi, dayNumber, poiIndexInDay }) => {
              const visitTime = formatVisitWindow(poi.plannedAt, poi.durationMin);
              return (
                <SwiperSlide key={`${dayNumber}-${poi.id}`} className="journey-poi-slide">
                  <div
                    className="journey-poi-card"
                    style={{ background: getDayCardColor(dayNumber) }}
                    onClick={() => {
                      setActivePoiIndex(poiIndexInDay);
                      setSelectedPoiId(poi.id);
                    }}
                  >
                    {/* Left: image */}
                    <div className="journey-poi-card__img">
                      {poi.photos && poi.photos.length > 0 ? (
                        <img src={poi.photos[0]} alt={poi.name} loading="lazy" />
                      ) : (
                        <div className="journey-poi-card__img-placeholder" />
                      )}
                    </div>

                    {/* Right: info */}
                    <div className="journey-poi-card__content">
                      <div className="journey-poi-card__name">{poi.name}</div>
                      <div className="journey-poi-card__meta">
                        <span className="journey-poi-card__category">
                          {categoryLabel[poi.category]}
                        </span>
                      </div>
                      {visitTime && (
                        <div className="journey-poi-card__time">{visitTime}</div>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Bottom indicator: prev commute | seq number | next commute */}
          <div className="journey-poi-indicator">
            <div className="journey-poi-indicator__dot" />
            <div className="journey-poi-indicator__mid">
              <span className="journey-poi-indicator__commute journey-poi-indicator__commute--left">
                {prevCommuteText ?? ''}
              </span>
              <div className="journey-poi-indicator__number">
                {activePoi ? activePoi.poiIndexInDay + 1 : 1}
              </div>
              <span className="journey-poi-indicator__commute journey-poi-indicator__commute--right">
                {nextCommuteText ?? ''}
              </span>
            </div>
            <div className="journey-poi-indicator__dot" />
          </div>
        </div>
      )}
    </>
  );
};

export default DateStrip;
