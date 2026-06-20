import type { DirectionsLeg } from '../../lib/mapDirections';
import { formatLegDistance, formatLegDuration } from '../../lib/mapDirections';

interface DriveConnectorProps {
  leg: DirectionsLeg | null;
  loading?: boolean;
}

const WalkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="1.5" />
    <path d="M9 20l3-8 3 8M10.5 14l-2-3.5 4-2.5" />
  </svg>
);

const CarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2" />
    <circle cx="7.5" cy="17" r="1.5" />
    <circle cx="16.5" cy="17" r="1.5" />
  </svg>
);

const DriveConnector = ({ leg, loading }: DriveConnectorProps) => {
  if (loading) {
    return (
      <div className="journey-leg">
        <span className="journey-leg__text">路线计算中…</span>
      </div>
    );
  }

  if (!leg) {
    return (
      <div className="journey-leg">
        <span className="journey-leg__text">距离待补充</span>
      </div>
    );
  }

  const km = leg.distanceM / 1000;
  const isWalking = km < 2;

  return (
    <div className="journey-leg">
      <span className="journey-leg__icon">
        {isWalking ? <WalkIcon /> : <CarIcon />}
      </span>
      <span className="journey-leg__text">
        {formatLegDistance(km)} · {formatLegDuration(leg.durationS)}
      </span>
      <span className="journey-leg__arrow">{'>'}</span>
    </div>
  );
};

export default DriveConnector;
