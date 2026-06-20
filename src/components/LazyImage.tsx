import { useState, type ImgHTMLAttributes } from 'react';

/**
 * Trip-themed image placeholder.
 * - Soft gradient backdrop (cream → moss tint), matches the Walter-Mitty palette.
 * - Stylized map silhouette drawn in SVG.
 * - Used as both lazy-load skeleton and final fallback when an image errors out.
 *
 * Usage:
 *   <LazyImage src={url} alt={name} />
 *   <LazyImage src={url} alt={name} eager />
 *
 * The component renders the placeholder underneath the <img> and fades the image
 * over it via CSS transition once it loads. On error the <img> is hidden, so the
 * placeholder stays visible.
 */
type LazyImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> & {
  src?: string | null;
  alt: string;
  /** Force eager loading (above-the-fold heroes). Default lazy. */
  eager?: boolean;
};

export const TripPlaceholder = ({ className = '' }: { className?: string }) => (
  <div className={`lazy-iceland-placeholder ${className}`} aria-hidden>
    <svg
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
    >
      <defs>
        <linearGradient id="li-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f1e8" />
          <stop offset="60%" stopColor="#e8eee5" />
          <stop offset="100%" stopColor="#dde6dc" />
        </linearGradient>
        <linearGradient id="li-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6bc87a" stopOpacity="0" />
          <stop offset="50%" stopColor="#4db8a8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6bc87a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="li-mountain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a9787" />
          <stop offset="100%" stopColor="#4a6a5a" />
        </linearGradient>
        <linearGradient id="li-glacier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f4f8" />
          <stop offset="100%" stopColor="#bcd3d8" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="200" height="120" fill="url(#li-sky)" />

      {/* Aurora wisps */}
      <path
        d="M 0 28 Q 50 14 100 24 T 200 22"
        stroke="url(#li-aurora)"
        strokeWidth="6"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 0 38 Q 60 26 120 34 T 200 36"
        stroke="url(#li-aurora)"
        strokeWidth="3.5"
        fill="none"
        opacity="0.5"
      />

      {/* Glacier curve */}
      <path
        d="M 0 92 L 0 70 Q 30 60 60 66 Q 90 72 120 64 Q 160 54 200 64 L 200 92 Z"
        fill="url(#li-glacier)"
        opacity="0.85"
      />

      {/* Background mountain (草帽山 silhouette) */}
      <path
        d="M 30 92 L 60 50 L 78 68 L 92 56 L 110 92 Z"
        fill="url(#li-mountain)"
        opacity="0.75"
      />

      {/* Foreground volcano */}
      <path
        d="M 110 92 L 145 42 L 175 92 Z"
        fill="url(#li-mountain)"
      />
      {/* Snow cap on volcano */}
      <path
        d="M 138 52 L 145 42 L 152 52 L 148 56 L 142 56 Z"
        fill="#f5f1e8"
        opacity="0.9"
      />

      {/* Ground */}
      <rect y="92" width="200" height="28" fill="#a7b9a3" opacity="0.6" />

      {/* Subtle dots ~ falling snow / stars */}
      <circle cx="20" cy="14" r="0.8" fill="#fff" opacity="0.7" />
      <circle cx="160" cy="20" r="0.6" fill="#fff" opacity="0.6" />
      <circle cx="180" cy="10" r="0.9" fill="#fff" opacity="0.7" />
      <circle cx="40" cy="22" r="0.5" fill="#fff" opacity="0.5" />
    </svg>
  </div>
);

const LazyImage = ({
  src,
  alt,
  eager = false,
  className = '',
  onLoad,
  onError,
  ...rest
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showImage = !!src && !errored;

  return (
    <span className={`lazy-image-wrap ${className}`}>
      <TripPlaceholder />
      {showImage && (
        <img
          {...rest}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={`lazy-image-img ${loaded ? 'lazy-image-img--loaded' : ''}`}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setErrored(true);
            onError?.(e);
          }}
        />
      )}
    </span>
  );
};

export default LazyImage;
