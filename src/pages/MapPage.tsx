import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import { itinerary } from '../data/itinerary';

const MapPage = () => {
  return (
    <div className="px-5 pt-12 pb-8 overflow-x-hidden">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-base font-semibold"
        style={{
          background: 'var(--green-light)',
          color: 'var(--green)',
          border: '1px solid var(--green)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M19 12H5m7-7l-7 7 7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        行程列表
      </Link>

      <div
        className="flex items-center gap-2 text-sm mt-5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>🗺</span>
        <span>行程地图</span>
        <span className="deco-dots" />
      </div>
      <div className="journal-card overflow-hidden mt-3">
        <MapView
          pois={itinerary.pois}
          heightClass="h-[70vh]"
          numbered={false}
        />
      </div>
      <div
        className="flex items-center justify-between text-sm mt-3"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>📍 共 {itinerary.pois.length} 个停留点</span>
        <span>点击标记查看名称 · Mapbox</span>
      </div>
    </div>
  );
};

export default MapPage;
