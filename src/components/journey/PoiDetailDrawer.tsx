import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Drawer } from 'vaul';
import { useJourneyMapContext } from '../../context/JourneyMapContext';
import { itinerary } from '../../data/itinerary';
import type { Poi } from '../../data/types';
import {
  JOURNEY_SCROLL_CONTAINER_ID,
  measureScrollOffset,
} from '../../lib/journeyScroll';
import type { ActiveDayValue } from '../../lib/journeyTypes';

const categoryMeta: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  sight: { label: '景点', color: '#5b8ba8', icon: '📸' },
  food: { label: '就餐', color: '#b8836a', icon: '🍽' },
  lodging: { label: '住宿', color: '#7a7aaa', icon: '🏨' },
  drive: { label: '驾驶', color: '#5a9a7a', icon: '🚗' },
  experience: { label: '体验', color: '#9a7aaa', icon: '🎯' },
  transit: { label: '交通', color: '#999', icon: '🚌' },
};

/** Generate deterministic mock reviews based on POI name so they feel consistent. */
function getMockReviews(poiName: string) {
  const hash = poiName.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  const positivePool = [
    { tag: '景色优美', text: '景色实在太美了，独特的自然风光让人流连忘返。' },
    { tag: '治愈之地', text: '人生时间就该更多"浪费"在这样的地方。' },
    { tag: '出片圣地', text: '每一帧都是壁纸，随手一拍就是大片。' },
    { tag: '必打卡', text: '值得专程来一趟的经典景点，强烈推荐！' },
    { tag: '浪漫极光', text: '如果运气好，这里能看到绝美的北极光。' },
  ];
  const negativePool = [
    { tag: '停车困难', text: '停车位有限，旺季建议早到或提前预订。' },
    { tag: '徒步风险', text: '部分路段较滑，建议穿防滑鞋并注意安全。' },
    { tag: '风力较大', text: '户外景点风大，注意保暖与安全。' },
    { tag: '天气多变', text: '出行前查看天气预报，记得带防水衣物。' },
    { tag: '游客较多', text: '旺季游客很多，建议错峰出行体验更好。' },
  ];

  const pos1 = positivePool[hash % positivePool.length];
  const pos2 = positivePool[(hash + 1) % positivePool.length];
  const neg1 = negativePool[hash % negativePool.length];
  const neg2 = negativePool[(hash + 2) % negativePool.length];

  return {
    positive: [pos1, pos2],
    negative: [neg1, neg2],
  };
}

const SNAP_HALF = 0.5;
const SNAP_FULL = 0.88;

const PoiDetailDrawer = () => {
  const {
    days,
    selectedPoiId,
    setSelectedPoiId,
    sheetSnap,
    setSheetSnap,
    activePoiIndex,
    setActivePoiIndex,
    activeDay,
    setActiveDay,
    setMainSheetParked,
    setPoiDrawerOverlayPx,
  } = useJourneyMapContext();

  const drawerContentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevPoiRef = useRef<Poi | null>(null);
  const prevDrawerStateRef = useRef<{
    sheetSnap: number | string | null;
    activePoiIndex: number | null;
    activeDay: ActiveDayValue;
    focusDay: number;
    focusPoiIndex: number;
  } | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainSheetSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const selectedPoiIdRef = useRef(selectedPoiId);

  const open = selectedPoiId != null;
  const [activeSnap, setActiveSnap] = useState<number | string | null>(
    SNAP_HALF,
  );

  useLayoutEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [open, selectedPoiId]);

  const poi = useMemo(() => {
    if (!selectedPoiId) return null;
    return itinerary.pois.find((p) => p.id === selectedPoiId) ?? null;
  }, [selectedPoiId]);

  const selectedPoiTarget = useMemo(() => {
    if (!selectedPoiId) return null;
    for (const { plan, stops } of days) {
      const index = stops.findIndex((stop) => stop.id === selectedPoiId);
      if (index >= 0) {
        return {
          focusPoiId: selectedPoiId,
          focusDay: plan.day,
          focusPoiIndex: index,
        };
      }
    }
    return null;
  }, [days, selectedPoiId]);

  // Keep last POI around for close animation
  if (poi) prevPoiRef.current = poi;
  const displayPoi = poi ?? prevPoiRef.current;

  // Sync ref for timer callbacks
  useEffect(() => {
    selectedPoiIdRef.current = selectedPoiId;
  }, [selectedPoiId]);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      if (mainSheetSyncTimerRef.current) {
        clearTimeout(mainSheetSyncTimerRef.current);
      }
    };
  }, []);

  // Track visible drawer height so journey-locate-btn can sit just above it (incl. while dragging)
  useEffect(() => {
    if (!open) {
      setPoiDrawerOverlayPx(null);
      return;
    }

    let raf = 0;
    const measure = () => {
      const el = drawerContentRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setPoiDrawerOverlayPx(Math.max(0, window.innerHeight - top));
    };

    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      setPoiDrawerOverlayPx(null);
    };
  }, [open, setPoiDrawerOverlayPx]);

  // On first mount, clear any stale selectedPoiId left from a previous navigation
  useEffect(() => {
    if (selectedPoiId != null) {
      setSelectedPoiId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncMainSheetToDay = useCallback((day: number) => {
    if (mainSheetSyncTimerRef.current) {
      clearTimeout(mainSheetSyncTimerRef.current);
      mainSheetSyncTimerRef.current = null;
    }

    let attempts = 0;
    const scroll = () => {
      attempts += 1;
      const container = document.getElementById(JOURNEY_SCROLL_CONTAINER_ID);
      const section = container?.querySelector<HTMLElement>(
        `.journey-day-section[data-day="${day}"]`,
      );

      if (container && section && section.offsetParent !== null) {
        const offset = measureScrollOffset(container);
        const containerTop = container.getBoundingClientRect().top;
        const sectionTop = section.getBoundingClientRect().top;
        container.scrollTo({
          top: Math.max(
            0,
            container.scrollTop + sectionTop - containerTop - offset,
          ),
          behavior: 'auto',
        });
        mainSheetSyncTimerRef.current = null;
        return;
      }

      if (attempts < 8) {
        mainSheetSyncTimerRef.current = setTimeout(scroll, 40);
      } else {
        mainSheetSyncTimerRef.current = null;
      }
    };

    mainSheetSyncTimerRef.current = setTimeout(scroll, 0);
  }, []);

  // Record main drawer state, then park it below the viewport while POI detail is open.
  useEffect(() => {
    if (selectedPoiId != null && prevDrawerStateRef.current === null) {
      // Cancel any pending restore so rapid open/close doesn't glitch
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
      prevDrawerStateRef.current = {
        sheetSnap,
        activePoiIndex,
        activeDay,
        focusDay:
          selectedPoiTarget?.focusDay ??
          (typeof activeDay === 'number' ? activeDay : 1),
        focusPoiIndex: selectedPoiTarget?.focusPoiIndex ?? activePoiIndex ?? 0,
      };
      if (selectedPoiTarget) {
        setActivePoiIndex(selectedPoiTarget.focusPoiIndex);
        if (activeDay !== selectedPoiTarget.focusDay) {
          setActiveDay(selectedPoiTarget.focusDay);
        }
      }
      setMainSheetParked(true);
      syncMainSheetToDay(
        selectedPoiTarget?.focusDay ??
          (typeof activeDay === 'number' ? activeDay : 1),
      );
      setActiveSnap(SNAP_HALF);
    }
  }, [
    selectedPoiId,
    sheetSnap,
    activePoiIndex,
    activeDay,
    selectedPoiTarget,
    setMainSheetParked,
    syncMainSheetToDay,
    setActivePoiIndex,
    setActiveDay,
  ]);

  const handleClose = useCallback(() => {
    const prev = prevDrawerStateRef.current;
    prevDrawerStateRef.current = null;
    setSelectedPoiId(null);
    if (prev) {
      // Restore tab/carousel state immediately so the correct day is shown at once.
      setActivePoiIndex(prev.focusPoiIndex);
      setActiveDay(prev.focusDay);
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
      }
      // Wait for POI detail close animation (0.42s) to finish before restoring main drawer
      restoreTimerRef.current = setTimeout(() => {
        restoreTimerRef.current = null;
        // If user already opened another POI, skip restore
        if (selectedPoiIdRef.current != null) return;
        setSheetSnap(prev.sheetSnap);
        setMainSheetParked(false);
      }, 400);
    } else {
      setMainSheetParked(false);
    }
  }, [
    setSelectedPoiId,
    setSheetSnap,
    setActivePoiIndex,
    setActiveDay,
    setMainSheetParked,
  ]);

  const handleSnapChange = useCallback(
    (snap: number | string | null) => {
      if (snap === null) {
        handleClose();
      } else {
        setActiveSnap(snap);
      }
    },
    [handleClose],
  );


  if (!displayPoi) return null;

  const meta = categoryMeta[displayPoi.category] || {
    label: displayPoi.category,
    color: '#888',
    icon: '📍',
  };

  const reviews = getMockReviews(displayPoi.name);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
      modal={false}
      dismissible={true}
      snapPoints={[SNAP_HALF, SNAP_FULL]}
      snapToSequentialPoint
      activeSnapPoint={open ? activeSnap : null}
      setActiveSnapPoint={handleSnapChange}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          ref={drawerContentRef}
          className="poi-detail-drawer"
        >
          <Drawer.Title className="journey-vaul-sr-only">
            {displayPoi.name}
          </Drawer.Title>
          <Drawer.Description className="journey-vaul-sr-only">
            景点详情
          </Drawer.Description>
          <div className="poi-detail-inner">
            <Drawer.Handle className="poi-detail-handle" />

            {/* Title bar stays outside no-drag scroll so the sheet can be dragged up */}
            <div className="poi-detail-chrome">
              <div className="poi-detail-header">
                <h2 className="poi-detail-title">{displayPoi.name}</h2>
                <button
                  type="button"
                  className="poi-detail-close"
                  data-vaul-no-drag
                  onClick={handleClose}
                  aria-label="关闭"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="poi-detail-meta-row">
                <span className="poi-detail-meta-item">
                  <span className="poi-detail-meta-dot" />
                  {meta.label}
                </span>
                {displayPoi.plannedAt && (
                  <span className="poi-detail-meta-item">
                    🕐 {displayPoi.plannedAt}
                  </span>
                )}
                {displayPoi.durationMin != null && (
                  <span className="poi-detail-meta-item">
                    ⏱ {displayPoi.durationMin}分钟
                  </span>
                )}
              </div>
            </div>

            <div ref={scrollRef} className="poi-detail-scroll" data-vaul-no-drag>
              {/* Hero image */}
              <div className="poi-detail-hero-wrap">
                {displayPoi.photos && displayPoi.photos.length > 0 ? (
                  <img
                    src={displayPoi.photos[0]}
                    alt={displayPoi.name}
                    className="poi-detail-hero-img"
                    loading="eager"
                  />
                ) : (
                  <div className="poi-detail-hero-img poi-detail-hero-img--placeholder" />
                )}
              </div>

              {/* Description */}
              {displayPoi.notes && (
                <div className="poi-detail-section">
                  <div className="poi-detail-section-header">
                    <span className="poi-detail-section-title">地点介绍</span>
                    <span className="poi-detail-section-tag--ai">AI生成</span>
                  </div>
                  <p className="poi-detail-desc">{displayPoi.notes}</p>
                </div>
              )}

              {/* Reviews */}
              <div className="poi-detail-section">
                <h3 className="poi-detail-section-title">真实评价</h3>
                <div className="poi-detail-review-list">
                  {reviews.positive.map((r) => (
                    <div key={r.tag} className="poi-detail-review-item">
                      <span className="poi-detail-tag poi-detail-tag--positive">
                        {r.tag}
                      </span>
                      <span className="poi-detail-review-text">{r.text}</span>
                    </div>
                  ))}
                  {reviews.negative.map((r) => (
                    <div key={r.tag} className="poi-detail-review-item">
                      <span className="poi-detail-tag poi-detail-tag--negative">
                        {r.tag}
                      </span>
                      <span className="poi-detail-review-text">{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              {displayPoi.address && (
                <div className="poi-detail-section poi-detail-address">
                  <div className="poi-detail-address-icon">📍</div>
                  <div className="poi-detail-address-text">
                    <p className="poi-detail-address-label">地址</p>
                    <p>{displayPoi.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default PoiDetailDrawer;
