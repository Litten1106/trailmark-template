import { useEffect, useState } from 'react';
import {
  heroEdgeGradientFromSrc,
  linearGradientDominantToWhite,
} from '../lib/heroEdgeGradient';

const FALLBACK = linearGradientDominantToWhite([10, 22, 40]);

/**
 * CSS `background` for hero → content seam (Color Thief dominant → white).
 */
export function useHeroEdgeGradient(src: string | undefined): string {
  const [gradient, setGradient] = useState(FALLBACK);

  useEffect(() => {
    if (!src) {
      setGradient(FALLBACK);
      return;
    }

    let cancelled = false;

    void heroEdgeGradientFromSrc(src).then((value) => {
      if (!cancelled) setGradient(value);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return gradient;
}
