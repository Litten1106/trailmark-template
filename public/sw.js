const TILE_CACHE = 'mapbox-tiles-v2';
const STYLE_CACHE = 'mapbox-style-v2';

const TILE_MAX = 1500;
const STYLE_MAX = 40;
const TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeCacheKey(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete('sku');
    u.searchParams.delete('access_token');
    return new Request(u.toString());
  } catch {
    return new Request(url);
  }
}

function isMapboxAsset(url) {
  return (
    url.includes('api.mapbox.com/v4/') ||
    url.includes('api.mapbox.com/fonts/') ||
    url.includes('api.mapbox.com/styles/v1/') ||
    url.includes('.tiles.mapbox.com/')
  );
}

function isStyleJson(url) {
  return (
    url.includes('api.mapbox.com/styles/v1/') &&
    !url.includes('/tiles/') &&
    !url.includes('/sprite') &&
    !url.includes('/glyphs')
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(
      keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)),
    );
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Drop the old broken caches
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n === 'mapbox-tiles-v1' || n === 'mapbox-style-v1')
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const { url } = e.request;

  if (e.request.method !== 'GET' || !url.includes('mapbox.com')) return;
  if (url.includes('events.mapbox.com')) return;
  if (!isMapboxAsset(url)) return;

  const cacheKey = normalizeCacheKey(url);

  if (isStyleJson(url)) {
    e.respondWith(
      caches.open(STYLE_CACHE).then(async (cache) => {
        const cached = await cache.match(cacheKey);
        const fetchPromise = fetch(e.request)
          .then((res) => {
            if (res.ok) {
              cache.put(cacheKey, res.clone());
              trimCache(STYLE_CACHE, STYLE_MAX);
            }
            return res;
          })
          .catch(() => null);
        return cached ?? (await fetchPromise) ?? fetch(e.request);
      }),
    );
    return;
  }

  // tiles / fonts / sprites — cache-first
  e.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const dateHeader = cached.headers.get('date');
        const age = dateHeader
          ? Date.now() - new Date(dateHeader).getTime()
          : 0;
        if (age > TILE_TTL_MS) {
          fetch(e.request)
            .then((res) => {
              if (res.ok) {
                cache.put(cacheKey, res.clone());
                trimCache(TILE_CACHE, TILE_MAX);
              }
            })
            .catch(() => {});
        }
        return cached;
      }
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          cache.put(cacheKey, res.clone());
          trimCache(TILE_CACHE, TILE_MAX);
        }
        return res;
      } catch {
        return Response.error();
      }
    }),
  );
});
