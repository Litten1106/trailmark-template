import { useEffect, useState } from 'react';
import { coverForActiveDay } from '../../lib/dayCovers';
import type { ActiveDayValue } from '../../lib/journeyTypes';

interface JourneyBackdropProps {
  activeDay: ActiveDayValue;
  visible: boolean;
}

const FADE_MS = 450;

const JourneyBackdrop = ({ activeDay, visible }: JourneyBackdropProps) => {
  const targetSrc = coverForActiveDay(activeDay);
  const [displaySrc, setDisplaySrc] = useState(targetSrc);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (targetSrc === displaySrc) return;

    const img = new Image();
    img.src = targetSrc;
    const swap = () => {
      setFade(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplaySrc(targetSrc);
          setFade(true);
        });
      });
    };
    if (img.complete) swap();
    else {
      img.onload = swap;
      img.onerror = swap;
    }
  }, [targetSrc, displaySrc]);

  return (
    <div
      className={`journey-backdrop ${visible ? 'journey-backdrop--visible' : ''}`}
      aria-hidden
    >
      <div
        className="journey-backdrop__layer"
        style={{
          backgroundImage: visible ? `url(${displaySrc})` : undefined,
          opacity: fade ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
    </div>
  );
};

export default JourneyBackdrop;
