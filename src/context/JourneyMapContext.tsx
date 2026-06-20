import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useJourneyRoutes } from '../hooks/useJourneyRoutes';
import { resetMapCameraCache } from '../lib/journeyMapBounds';
import { parseInitialDay } from '../lib/journeyData';
import { SHEET_SNAP_DAY } from '../components/journey/JourneyBottomSheet';
import type { JourneyDayData } from '../lib/journeyData';
import type { DayDirectionsResult, DirectionsLeg } from '../lib/mapDirections';
import type { ActiveDayValue } from '../lib/journeyTypes';

interface JourneyMapContextValue {
  days: JourneyDayData[];
  routesByDay: Map<number, DayDirectionsResult>;
  loading: boolean;
  getLeg: (day: number, legIndex: number) => DirectionsLeg | null;
  activeDay: ActiveDayValue;
  setActiveDay: (day: ActiveDayValue) => void;
  sheetSnap: number | string | null;
  setSheetSnap: (snap: number | string | null) => void;
  mapCameraAnimate: boolean;
  triggerCameraAnimate: () => void;
  resetCamera: () => void;
  /** Increments each call — JourneyMap watches this to force-refit with animation. */
  refitCounter: number;
  refitCamera: () => void;
  /** 0-based index of the highlighted POI within the current day (null = none). */
  activePoiIndex: number | null;
  setActivePoiIndex: (idx: number | null) => void;
  /** Currently selected POI id for detail drawer (null = closed). */
  selectedPoiId: string | null;
  setSelectedPoiId: (id: string | null) => void;
  /** Keep the itinerary sheet mounted but parked below the viewport. */
  mainSheetParked: boolean;
  setMainSheetParked: (parked: boolean) => void;
  /** Visible POI detail drawer height from bottom (px); null when closed. */
  poiDrawerOverlayPx: number | null;
  setPoiDrawerOverlayPx: (px: number | null) => void;
}

const JourneyMapContext = createContext<JourneyMapContextValue | undefined>(
  undefined,
);

function parseActiveDayFromPathname(pathname: string): ActiveDayValue {
  const m = pathname.match(/^\/day\/([^/]+)/);
  return m ? parseInitialDay(m[1]) : 'overview';
}

export function JourneyMapProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { days, routesByDay, loading, getLeg } = useJourneyRoutes();

  const [activeDay, setActiveDay] = useState<ActiveDayValue>(() =>
    parseActiveDayFromPathname(location.pathname),
  );
  const [sheetSnap, setSheetSnap] = useState<number | string | null>(
    SHEET_SNAP_DAY,
  );
  const [mapCameraAnimate, setMapCameraAnimate] = useState(false);
  const [refitCounter, setRefitCounter] = useState(0);
  const [activePoiIndex, setActivePoiIndex] = useState<number | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [mainSheetParked, setMainSheetParked] = useState(false);
  const [poiDrawerOverlayPx, setPoiDrawerOverlayPx] = useState<number | null>(
    null,
  );
  const cameraAnimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCameraAnimate = useCallback(() => {
    if (cameraAnimateTimer.current) clearTimeout(cameraAnimateTimer.current);
    setMapCameraAnimate(true);
    cameraAnimateTimer.current = setTimeout(
      () => setMapCameraAnimate(false),
      450,
    );
  }, []);

  const resetCamera = useCallback(() => {
    resetMapCameraCache();
  }, []);

  const refitCamera = useCallback(() => {
    resetMapCameraCache();
    setRefitCounter((n) => n + 1);
  }, []);

  // Keep map day in sync when entering /day/:id from home or direct links.
  useEffect(() => {
    if (!location.pathname.startsWith('/day/')) return;
    const dayFromPath = parseActiveDayFromPathname(location.pathname);
    setActiveDay(dayFromPath);
    resetMapCameraCache();
    triggerCameraAnimate();
    setRefitCounter((n) => n + 1);
  }, [location.pathname, triggerCameraAnimate]);

  const value = useMemo<JourneyMapContextValue>(
    () => ({
      days,
      routesByDay,
      loading,
      getLeg,
      activeDay,
      setActiveDay,
      sheetSnap,
      setSheetSnap,
      mapCameraAnimate,
      triggerCameraAnimate,
      resetCamera,
      refitCounter,
      refitCamera,
      activePoiIndex,
      setActivePoiIndex,
      selectedPoiId,
      setSelectedPoiId,
      mainSheetParked,
      setMainSheetParked,
      poiDrawerOverlayPx,
      setPoiDrawerOverlayPx,
    }),
    [
      days,
      routesByDay,
      loading,
      getLeg,
      activeDay,
      sheetSnap,
      mapCameraAnimate,
      triggerCameraAnimate,
      resetCamera,
      refitCounter,
      refitCamera,
      activePoiIndex,
      selectedPoiId,
      mainSheetParked,
      poiDrawerOverlayPx,
    ],
  );

  return (
    <JourneyMapContext.Provider value={value}>
      {children}
    </JourneyMapContext.Provider>
  );
}

export function useJourneyMapContext(): JourneyMapContextValue {
  const ctx = useContext(JourneyMapContext);
  if (!ctx)
    throw new Error(
      'useJourneyMapContext must be used within JourneyMapProvider',
    );
  return ctx;
}
