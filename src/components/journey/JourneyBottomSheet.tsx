import { type ReactNode, useCallback, useMemo } from 'react';
import { Drawer } from 'vaul';
import { itinerary } from '../../data/itinerary';
import { JOURNEY_SCROLL_CONTAINER_ID } from '../../lib/journeyScroll';

/** Lowest snap — more map visible (overview). */
export const SHEET_SNAP_OVERVIEW = 0.32;
/** Default snap when viewing a day. */
export const SHEET_SNAP_DAY = 0.55;

interface JourneyBottomSheetProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  header: ReactNode;
  children: ReactNode;
  activeSnapPoint: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  parked?: boolean;
}

const JourneyBottomSheet = ({
  scrollRef,
  header,
  children,
  activeSnapPoint,
  onSnapChange,
  parked = false,
}: JourneyBottomSheetProps) => {
  const snapPoints = useMemo(
    () => [SHEET_SNAP_OVERVIEW, SHEET_SNAP_DAY, 0.88] as const,
    [],
  );

  // Intercept null (close attempt) and redirect to the minimum snap instead
  const handleSnapChange = useCallback(
    (snap: number | string | null) => {
      if (snap === null) {
        onSnapChange(SHEET_SNAP_OVERVIEW);
      } else {
        onSnapChange(snap);
      }
    },
    [onSnapChange],
  );

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      handleOnly
      shouldScaleBackground={false}
      snapPoints={[...snapPoints]}
      snapToSequentialPoint
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={handleSnapChange}
      onOpenChange={(open) => {
        // Prevent Vaul from closing the drawer entirely
        if (!open) onSnapChange(SHEET_SNAP_OVERVIEW);
      }}
      fadeFromIndex={0}
    >
      <Drawer.Portal>
        <Drawer.Content
          className={`journey-vaul-content${parked ? ' journey-vaul-content--parked' : ''}`}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Drawer.Title className="journey-vaul-sr-only">{itinerary.title}</Drawer.Title>
          <Drawer.Description className="journey-vaul-sr-only">
            行程列表与日期切换
          </Drawer.Description>
          <div className="journey-vaul-inner">
            <Drawer.Handle className="journey-vaul-handle" />
            <div
              ref={scrollRef}
              id={JOURNEY_SCROLL_CONTAINER_ID}
              className="journey-vaul-scroll"
            >
              <div className="journey-vaul-header journey-vaul-header--sticky">
                {header}
              </div>
              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default JourneyBottomSheet;
