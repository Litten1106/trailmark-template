import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  getMapboxStyleUrl,
  getTripCenter,
} from '../../lib/map';
import {
  bootstrapTripMap,
  resetMapCameraCache,
  SHEET_SNAP_DAY_DEFAULT,
} from '../../lib/journeyMapBounds';
import { preloadMapbox, warmMapboxStyle } from '../../lib/mapPreload';
import { updateJourneyMapForActiveDay } from '../../lib/journeyMapLayers';
import {
  POI_CIRCLE_LAYER_ID,
  POI_LODGING_LAYER_ID,
} from '../../lib/mapLayers';
import type { DayDirectionsResult } from '../../lib/mapDirections';
import type { JourneyDayData } from '../../lib/journeyData';
import type { ActiveDayValue } from '../../lib/journeyTypes';
import { useJourneyMapContext } from '../../context/JourneyMapContext';

const JOURNEY_BLUE = '#4A9EF5';
const HIGHLIGHT_COLOR = '#f59e0b';
const LODGING_DEFAULT_SIZE = 0.85;
const LODGING_HIGHLIGHT_SIZE = 1.05;

function applyPoiHighlight(
  map: mapboxgl.Map,
  highlightId: string | null,
): void {
  if (highlightId) {
    map.setPaintProperty(POI_CIRCLE_LAYER_ID, 'circle-color', [
      'match',
      ['get', 'id'],
      highlightId,
      HIGHLIGHT_COLOR,
      JOURNEY_BLUE,
    ]);
    if (map.getLayer(POI_LODGING_LAYER_ID)) {
      map.setLayoutProperty(POI_LODGING_LAYER_ID, 'icon-size', [
        'match',
        ['get', 'id'],
        highlightId,
        LODGING_HIGHLIGHT_SIZE,
        LODGING_DEFAULT_SIZE,
      ]);
    }
    return;
  }

  map.setPaintProperty(POI_CIRCLE_LAYER_ID, 'circle-color', JOURNEY_BLUE);
  if (map.getLayer(POI_LODGING_LAYER_ID)) {
    map.setLayoutProperty(
      POI_LODGING_LAYER_ID,
      'icon-size',
      LODGING_DEFAULT_SIZE,
    );
  }
}

function resolveActivePoiId(
  days: JourneyDayData[],
  activeDay: ActiveDayValue,
  activePoiIndex: number | null,
): string | null {
  if (activePoiIndex == null || activeDay === 'overview') return null;
  const dayData = days.find((d) => d.plan.day === activeDay);
  return dayData?.stops[activePoiIndex]?.id ?? null;
}

interface JourneyMapProps {
  days: JourneyDayData[];
  activeDay: ActiveDayValue;
  routesByDay: Map<number, DayDirectionsResult>;
  /** Vaul sheet snap (0–1); used to fit POIs in the visible map band. */
  sheetSnap?: number;
  /** Animate camera only on tab/overview picks, not scroll-driven tab changes. */
  animateCamera?: boolean;
  onMapReady?: (ready: boolean) => void;
  /** Increment to force-refit with animation (from the locate button). */
  fitTrigger?: number;
  /** 0-based index of the highlighted POI dot in the current day. */
  activePoiIndex?: number | null;
}

const JourneyMap = ({
  days,
  activeDay,
  routesByDay,
  sheetSnap = SHEET_SNAP_DAY_DEFAULT,
  animateCamera = false,
  onMapReady,
  fitTrigger = 0,
  activePoiIndex = null,
}: JourneyMapProps) => {
  const { selectedPoiId, setSelectedPoiId } = useJourneyMapContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layersReadyRef = useRef(false);
  const prevActiveDayRef = useRef<ActiveDayValue | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [poiLayersReady, setPoiLayersReady] = useState(false);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onMapReadyRef.current?.(mapLoaded);
  }, [mapLoaded]);

  useEffect(() => {
    const token = getMapboxAccessToken();
    if (!token || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      await preloadMapbox();
      await warmMapboxStyle();
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token!;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapboxStyleUrl(),
        center: getTripCenter(),
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        fadeDuration: 0,
        renderWorldCopies: false,
        maxTileCacheSize: 512,
      });

      map.on('load', () => {
        if (cancelled) return;
        mapRef.current = map;
        layersReadyRef.current = false;
        resetMapCameraCache();
        bootstrapTripMap(map);
        setMapLoaded(true);
      });

      map.on('error', (e) => {
        const message = e.error?.message ?? '';
        if (message.includes('Failed to fetch')) return;

        console.warn('Mapbox 加载异常:', e.error);
      });
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersReadyRef.current = false;
      resetMapCameraCache();
      setMapLoaded(false);
      setPoiLayersReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || routesByDay.size === 0) return;

    const isForced = fitTrigger > 0;
    const skipCamera = !!selectedPoiId;

    const run = () => {
      const dayChanged =
        layersReadyRef.current &&
        prevActiveDayRef.current !== null &&
        prevActiveDayRef.current !== activeDay;
      updateJourneyMapForActiveDay(
        map,
        days,
        activeDay,
        routesByDay,
        !skipCamera && (isForced || (animateCamera && dayChanged)),
        sheetSnap,
        !skipCamera && isForced,
      );
      layersReadyRef.current = true;
      prevActiveDayRef.current = activeDay;
      setPoiLayersReady(!!map.getLayer(POI_CIRCLE_LAYER_ID));

      // updateJourneyMapForActiveDay resets circle-color; re-apply carousel/detail highlight
      if (map.getLayer(POI_CIRCLE_LAYER_ID)) {
        const highlightId =
          selectedPoiId ??
          resolveActivePoiId(days, activeDay, activePoiIndex);
        applyPoiHighlight(map, highlightId);
      }
    };

    if (map.isStyleLoaded()) {
      run();
    } else {
      map.once('idle', run);
      return () => {
        map.off('idle', run);
      };
    }
  }, [
    days,
    activeDay,
    routesByDay,
    mapLoaded,
    sheetSnap,
    animateCamera,
    fitTrigger,
    selectedPoiId,
    activePoiIndex,
  ]);

  // Highlight the active POI dot: selectedPoiId takes priority, then carousel index
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer(POI_CIRCLE_LAYER_ID)) return;

    const highlightId =
      selectedPoiId ?? resolveActivePoiId(days, activeDay, activePoiIndex);
    applyPoiHighlight(map, highlightId);
  }, [activePoiIndex, selectedPoiId, mapLoaded, days, activeDay]);

  // Layer-specific handlers — reliable for symbol (lodging) and circle POIs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || routesByDay.size === 0 || !poiLayersReady) return;

    const handleClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      const id = e.features?.[0]?.properties?.id;
      if (id != null && id !== '') setSelectedPoiId(String(id));
    };
    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', POI_CIRCLE_LAYER_ID, handleClick);
    map.on('mouseenter', POI_CIRCLE_LAYER_ID, handleEnter);
    map.on('mouseleave', POI_CIRCLE_LAYER_ID, handleLeave);

    const hasLodging = !!map.getLayer(POI_LODGING_LAYER_ID);
    if (hasLodging) {
      map.on('click', POI_LODGING_LAYER_ID, handleClick);
      map.on('mouseenter', POI_LODGING_LAYER_ID, handleEnter);
      map.on('mouseleave', POI_LODGING_LAYER_ID, handleLeave);
    }

    return () => {
      map.off('click', POI_CIRCLE_LAYER_ID, handleClick);
      map.off('mouseenter', POI_CIRCLE_LAYER_ID, handleEnter);
      map.off('mouseleave', POI_CIRCLE_LAYER_ID, handleLeave);
      if (hasLodging) {
        map.off('click', POI_LODGING_LAYER_ID, handleClick);
        map.off('mouseenter', POI_LODGING_LAYER_ID, handleEnter);
        map.off('mouseleave', POI_LODGING_LAYER_ID, handleLeave);
      }
      map.getCanvas().style.cursor = '';
    };
  }, [mapLoaded, routesByDay.size, poiLayersReady, setSelectedPoiId]);

  return (
    <div className="journey-map-wrap">
      <div
        ref={containerRef}
        className={`journey-map ${mapLoaded ? 'journey-map--ready' : ''}`}
      />
    </div>
  );
};

export default JourneyMap;
