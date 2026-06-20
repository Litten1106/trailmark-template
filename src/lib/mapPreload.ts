import { getMapboxAccessToken, getMapboxStyleUrl } from './map';

let mapboxModulePromise: Promise<typeof import('mapbox-gl')> | null = null;
let styleWarmPromise: Promise<void> | null = null;

/** Eager-load Mapbox GL + CSS (call on app boot or before /day). */
export function preloadMapbox(): Promise<typeof import('mapbox-gl')> {
  if (!mapboxModulePromise) {
    mapboxModulePromise = (
      Promise.all([
        import('mapbox-gl'),
        import('mapbox-gl/dist/mapbox-gl.css'),
      ]) as unknown as Promise<[typeof import('mapbox-gl'), unknown]>
    ).then(([mod]) => mod);
  }
  return mapboxModulePromise!;
}

/** Warm Mapbox style JSON so first /day paint is faster. */
export function warmMapboxStyle(): Promise<void> {
  const token = getMapboxAccessToken();
  if (!token) return Promise.resolve();

  if (!styleWarmPromise) {
    const style = getMapboxStyleUrl();
    const url = style.startsWith('mapbox://styles/')
      ? `https://api.mapbox.com/styles/v1/${style.replace('mapbox://styles/', '')}?access_token=${encodeURIComponent(token)}`
      : style;

    styleWarmPromise = fetch(url)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return styleWarmPromise;
}

export function preloadJourneyMap(): void {
  void preloadMapbox().then(() => warmMapboxStyle());
}
