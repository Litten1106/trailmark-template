import { Element } from 'react-scroll';
import { itinerary } from '../../data/itinerary';
import type { JourneyDayData } from '../../lib/journeyData';
import type { DirectionsLeg } from '../../lib/mapDirections';
import { journeyScrollTarget } from '../../lib/journeyScroll';
import { formatDayTabLabel } from '../../lib/visitTime';
import SpotCard from './SpotCard';
import DriveConnector from './DriveConnector';

interface ItineraryListProps {
  days: JourneyDayData[];
  getLeg: (day: number, legIndex: number) => DirectionsLeg | null;
  routesLoading: boolean;
}

const ItineraryList = ({ days, getLeg, routesLoading }: ItineraryListProps) => {
  return (
    <div className="journey-itinerary">
      <Element name="overview" className="journey-overview-header">
        <h2 className="journey-overview-header__title">{itinerary.title}</h2>
        <p className="journey-overview-header__sub">
          纵向滑动浏览全部行程；点击或横滑日期切换
        </p>
      </Element>

      {days.map(({ plan, stops }) => (
        <section
          key={plan.day}
          id={`day-section-${plan.day}`}
          className="journey-day-section"
          data-day={plan.day}
        >
          <Element
            name={journeyScrollTarget(plan.day)}
            className="journey-day-header"
          >
            <h2 className="journey-day-header__title">
              {formatDayTabLabel(plan.date)} {plan.title}
            </h2>
            {plan.summary && (
              <p className="journey-day-header__summary">{plan.summary}</p>
            )}
            {(plan.drivingKm != null || plan.lodging) && (
              <div className="journey-day-header__chips">
                {plan.drivingKm != null && (
                  <span className="journey-chip">
                    🚗 总驾驶 ~{plan.drivingKm}km
                    {plan.drivingDuration ? ` (${plan.drivingDuration})` : ''}
                  </span>
                )}
                {plan.lodging && (
                  <span className="journey-chip">🏨 {plan.lodging}</span>
                )}
              </div>
            )}
          </Element>

          <div className="journey-day-stops">
            {stops.map((poi, index) => (
              <div key={poi.id}>
                {index > 0 && (
                  <DriveConnector
                    leg={getLeg(plan.day, index - 1)}
                    loading={routesLoading}
                  />
                )}
                <SpotCard poi={poi} index={index} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ItineraryList;
