// ===== SERVICE WORKER =====
// Versi cache — naikkan angka ini setiap kali ada perubahan file
const CACHE_VERSION = 'broilertrack-v9';
const CACHE_NAME    = CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/charts.js',
  './js/auth/auth-service.js',
  './js/auth/auth-store.js',
  './js/supabase-client.js',
  './js/ts-visits.js',
  './js/period-targets.js',
  './js/medication.js',
  './js/deliveries.js',
  './js/production-costs.js',
  './js/permission-guards.js',
  './manifest.json',
  './icons/ayam.svg',
  './icons/karung-pakan.svg',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Space+Grotesk:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  './js/leaflet.min.js',
  './css/leaflet.min.css'
];

// ---- Install: cache semua aset ----
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('[SW] Cache addAll gagal:', err))
  );
  self.skipWaiting();
});

// ---- Activate: hapus cache lama ----
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Menghapus cache lama:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: cache-first untuk aset, network-first untuk API ----
self.addEventListener('fetch', e => {
  // Hanya tangani GET request
  if (e.request.method !== 'GET') return;

  // Jangan cache request ke auth pages (selalu fresh)
  const url = new URL(e.request.url);
  if (url.pathname.includes('/auth/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(response => {
          // Cache response baru yang valid
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback ke index.html untuk navigasi
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
