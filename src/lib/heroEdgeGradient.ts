import { getColor } from 'colorthief';

/**
 * Hero seam gradient — color from Color Thief (MIT).
 * @see https://github.com/lokesh/color-thief — MMCQ; dominant = largest pixel population.
 */
const FALLBACK_RGB: [number, number, number] = [10, 22, 40];

export function linearGradientDominantToWhite([r, g, b]: [
  number,
  number,
  number,
]): string {
  return `linear-gradient(to bottom, rgba(${r}, ${g}, ${b}, 0) 0%, rgba(${r}, ${g}, ${b}, 0.28) 28%, rgba(${r}, ${g}, ${b}, 0.72) 52%, rgba(${r}, ${g}, ${b}, 0.95) 68%, rgb(${r}, ${g}, ${b}) 76%, #ffffff 86%, #ffffff 94%, var(--cream) 100%)`;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  if (!img.complete) {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('hero image load failed'));
    });
  }
  return img;
}

/** Dominant RGB via Color Thief, then vertical fade to #ffffff. */
export async function heroEdgeGradientFromSrc(src: string): Promise<string> {
  try {
    const img = await loadImage(src);
    const color = await getColor(img, { colorSpace: 'rgb', quality: 5 });
    const rgb = color?.array() ?? FALLBACK_RGB;
    return linearGradientDominantToWhite(rgb);
  } catch {
    return linearGradientDominantToWhite(FALLBACK_RGB);
  }
}
