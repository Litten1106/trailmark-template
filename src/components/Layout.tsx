import { type ReactNode, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { JourneyMapProvider, useJourneyMapContext } from '../context/JourneyMapContext';
import JourneyMap from './journey/JourneyMap';
import PoiDetailDrawer from './journey/PoiDetailDrawer';
import { SHEET_SNAP_DAY } from './journey/JourneyBottomSheet';

const LayoutContent = (): ReactNode => {
  const location = useLocation();
  const isJourneyDay = location.pathname.startsWith('/day/');
  const outletKey = isJourneyDay ? 'journey-day' : location.pathname;

  const {
    days,
    routesByDay,
    activeDay,
    sheetSnap,
    mapCameraAnimate,
    refitCounter,
    activePoiIndex,
    triggerCameraAnimate,
    refitCamera,
  } = useJourneyMapContext();

  const wasJourneyDayRef = useRef(isJourneyDay);
  useEffect(() => {
    if (isJourneyDay && !wasJourneyDayRef.current) {
      // Map was hidden on home; refit after it becomes visible.
      const timer = window.setTimeout(() => {
        triggerCameraAnimate();
        refitCamera();
      }, 120);
      wasJourneyDayRef.current = true;
      return () => window.clearTimeout(timer);
    }
    if (!isJourneyDay) wasJourneyDayRef.current = false;
  }, [isJourneyDay, triggerCameraAnimate, refitCamera]);

  return (
    <div
      className={`min-h-full flex flex-col ${isJourneyDay ? 'journey-layout' : ''}`}
    >
      <div
        className={`journey-map-stack${isJourneyDay ? '' : ' journey-map-stack--hidden'}`}
      >
        <JourneyMap
          days={days}
          activeDay={activeDay}
          routesByDay={routesByDay}
          sheetSnap={typeof sheetSnap === 'number' ? sheetSnap : SHEET_SNAP_DAY}
          animateCamera={mapCameraAnimate}
          fitTrigger={refitCounter}
          activePoiIndex={activePoiIndex}
        />
        <PoiDetailDrawer />
      </div>
      <main
        className={
          isJourneyDay ? 'flex-1 w-full' : 'flex-1 mx-auto w-full max-w-3xl'
        }
      >
        <AnimatePresence mode="wait">
          <Outlet key={outletKey} />
        </AnimatePresence>
      </main>
      {!isJourneyDay && (
        <footer
          className="site-footer mx-auto max-w-3xl w-full px-5 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="site-footer__copy text-xs tracking-wide">
            Powered by{' '}
            <a
              href="https://github.com/linyanzu/trailmark"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Trailmark
            </a>
          </p>
        </footer>
      )}
    </div>
  );
};

const Layout = (): ReactNode => (
  <JourneyMapProvider>
    <LayoutContent />
  </JourneyMapProvider>
);

export default Layout;
