import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  DEFAULT_ZOOM,
  getMapboxAccessToken,
  getMapboxStyleUrl,
  getTripCenter,
  POI_MARKER_COLOR,
} from '../lib/map';
import {
  poiGeoJson,
  POI_CIRCLE_LAYER_ID,
  POI_LABEL_LAYER_ID,
  POI_SOURCE_ID,
} from '../lib/mapLayers';
import type { Poi } from '../data/types';

interface MapViewProps {
  pois: Poi[];
  heightClass?: string;
  className?: string;
  numbered?: boolean;
}

const MapView = ({
  pois,
  heightClass = 'h-[60vh]',
  className = '',
  numbered = false,
}: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const located = pois.filter((p): p is Poi & { location: [number, number] } =>
    Boolean(p.location),
  );

  useEffect(() => {
    const token = getMapboxAccessToken();
    if (!token) {
      setLoadError('未配置 PUBLIC_MAPBOX_ACCESS_TOKEN');
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: getMapboxStyleUrl(),
      center: getTripCenter(),
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right',
    );

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);
    });

    map.on('error', (e) => {
      const message = e.error?.message ?? '未知错误';
      setLoadError(`Mapbox 加载失败: ${message}`);
    });

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const removePoiLayers = () => {
      if (map.getLayer(POI_LABEL_LAYER_ID)) map.removeLayer(POI_LABEL_LAYER_ID);
      if (map.getLayer(POI_CIRCLE_LAYER_ID))
        map.removeLayer(POI_CIRCLE_LAYER_ID);
      if (map.getSource(POI_SOURCE_ID)) map.removeSource(POI_SOURCE_ID);
    };

    const syncLayers = () => {
      removePoiLayers();

      if (located.length === 0) {
        map.setCenter(getTripCenter());
        map.setZoom(DEFAULT_ZOOM);
        return;
      }

      const data = poiGeoJson(located, { numbered });
      map.addSource(POI_SOURCE_ID, { type: 'geojson', data });

      map.addLayer({
        id: POI_CIRCLE_LAYER_ID,
        type: 'circle',
        source: POI_SOURCE_ID,
        paint: {
          'circle-radius': numbered ? 14 : 10,
          'circle-color': POI_MARKER_COLOR,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      if (numbered) {
        map.addLayer({
          id: POI_LABEL_LAYER_ID,
          type: 'symbol',
          source: POI_SOURCE_ID,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 13,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      located.forEach((poi) => bounds.extend(poi.location));
      map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
    };

    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.once('idle', syncLayers);
    }
  }, [located, numbered, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const showPopup = (feature: mapboxgl.MapboxGeoJSONFeature) => {
      const coords = (
        feature.geometry as GeoJSON.Point
      ).coordinates.slice() as [number, number];
      const { name, notes } = feature.properties as {
        name: string;
        notes: string;
      };

      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        maxWidth: '280px',
      })
        .setLngLat(coords)
        .setHTML(
          `<strong>${escapeHtml(name)}</strong>${
            notes
              ? `<br><span style="color:#666;font-size:14px">${escapeHtml(notes)}</span>`
              : ''
          }`,
        )
        .addTo(map);
    };

    const onClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      if (!e.features?.[0]) return;
      showPopup(e.features[0]);
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', POI_CIRCLE_LAYER_ID, onClick);
    map.on('mouseenter', POI_CIRCLE_LAYER_ID, onEnter);
    map.on('mouseleave', POI_CIRCLE_LAYER_ID, onLeave);

    return () => {
      map.off('click', POI_CIRCLE_LAYER_ID, onClick);
      map.off('mouseenter', POI_CIRCLE_LAYER_ID, onEnter);
      map.off('mouseleave', POI_CIRCLE_LAYER_ID, onLeave);
    };
  }, [mapLoaded, located.length]);

  if (loadError) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div
          className={`w-full rounded-xl overflow-hidden border flex items-center justify-center ${heightClass}`}
          style={{
            background: 'var(--sand-light)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="text-center px-6">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              🗺 {loadError}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              配置方法：在 .env.local 中设置 PUBLIC_MAPBOX_ACCESS_TOKEN
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        ref={containerRef}
        className={`w-full rounded-xl overflow-hidden border mapbox-map ${heightClass}`}
        style={{ borderColor: 'var(--border)' }}
      />
      {!mapLoaded && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          地图加载中...
        </p>
      )}
      {mapLoaded && located.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          这一段还没填坐标，先看下方文字行程吧。
        </p>
      )}
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default MapView;
