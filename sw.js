const CACHE_NAME = 'proxiwake-v0.9';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/styles.css',
  './js/main.js', './js/config.js', './js/state.js', './js/utils.js', './js/ui.js',
  './js/map.js', './js/search.js', './js/wakelock.js', './js/alarm.js',
  './js/eta.js', './js/tracking.js', './js/lock.js', './js/icons.js',
  './js/route.js', './js/places.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png', './assets/icons/apple-touch-icon.png',
  './vendor/leaflet/leaflet.css', './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png'
];
/* Splash images are fetched once by the OS at install time; cache them lazily. */
const SPLASH = [
  './assets/splash/1290x2796.png', './assets/splash/1179x2556.png',
  './assets/splash/1284x2778.png', './assets/splash/1170x2532.png',
  './assets/splash/1242x2688.png', './assets/splash/828x1792.png',
  './assets/splash/1125x2436.png', './assets/splash/750x1334.png',
  './assets/splash/1536x2048.png', './assets/splash/1668x2388.png',
  './assets/splash/2048x2732.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Opportunistic runtime cache for splash images (stale-while-revalidate lite) */
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('/splash/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit ||
        fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
          return res;
        }))
    );
    return;
  }
  // Network-only for live data that must never go stale
  if (url.includes('project-osrm.org') || url.includes('/route/v1/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Network-first for live data (geocoding + map tiles)
  if (url.includes('nominatim') || url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for the app shell
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
