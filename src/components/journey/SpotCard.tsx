import type { Poi } from '../../data/types';
import { formatVisitWindow } from '../../lib/visitTime';
import { useJourneyMapContext } from '../../context/JourneyMapContext';
import LazyImage from '../LazyImage';

const categoryMeta: Record<Poi['category'], { label: string; color: string }> =
  {
    sight: { label: '景点', color: '#4a9ef5' },
    food: { label: '就餐', color: '#f59e0b' },
    lodging: { label: '住宿', color: '#8b5cf6' },
    drive: { label: '驾驶', color: '#6b7280' },
    experience: { label: '体验', color: '#10b981' },
    transit: { label: '交通', color: '#6b7280' },
  };

interface SpotCardProps {
  poi: Poi;
  index: number;
}

const SpotCard = ({ poi, index }: SpotCardProps) => {
  const { setSelectedPoiId } = useJourneyMapContext();
  const meta = categoryMeta[poi.category];
  const visitTime = formatVisitWindow(poi.plannedAt, poi.durationMin);

  return (
    <div
      className="block"
      id={`poi-${poi.id}`}
      onClick={() => setSelectedPoiId(poi.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelectedPoiId(poi.id);
        }
      }}
    >
      <article className="journey-spot-card">
        <div className="journey-spot-card__media">
          <LazyImage src={poi.photos?.[0]} alt={poi.name} />
        </div>
        <div className="journey-spot-card__body">
          <span
            className="journey-spot-card__category"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
          <h3 className="journey-spot-card__title">
            {index + 1}.{poi.name}
          </h3>
          {visitTime && (
            <span className="journey-spot-card__time">{visitTime}</span>
          )}
          {poi.notes && (
            <div className="journey-spot-card__notes-box">
              <p className="journey-spot-card__notes">{poi.notes}</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

export default SpotCard;
