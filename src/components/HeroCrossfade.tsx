import { useEffect, useRef, useState } from 'react';

interface HeroCrossfadeProps {
  src: string;
  alt?: string;
}

const FADE_MS = 550;

/**
 * Crossfades hero backgrounds after preload — layers always fill the hero box.
 */
const HeroCrossfade = ({ src, alt = '' }: HeroCrossfadeProps) => {
  const [topSrc, setTopSrc] = useState(src);
  const [bottomSrc, setBottomSrc] = useState(src);
  const [fadeTop, setFadeTop] = useState(true);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (src === topSrc && src === bottomSrc) return;

    pendingRef.current = src;
    const img = new Image();
    img.src = src;

    const swap = () => {
      const next = pendingRef.current;
      if (!next || next === topSrc) return;

      setBottomSrc(topSrc);
      setTopSrc(next);
      setFadeTop(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeTop(true));
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setBottomSrc(next);
        setFadeTop(true);
        pendingRef.current = null;
      }, FADE_MS);
    };

    if (img.complete) swap();
    else {
      img.onload = swap;
      img.onerror = swap;
    }
  }, [src, topSrc]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className="hero-bg" role="img" aria-label={alt}>
      <div
        className="hero-bg-layer"
        style={{ backgroundImage: `url(${bottomSrc})` }}
      />
      <div
        className="hero-bg-layer hero-bg-layer--fade"
        style={{
          backgroundImage: `url(${topSrc})`,
          opacity: fadeTop ? 1 : 0,
        }}
      />
    </div>
  );
};

export default HeroCrossfade;
