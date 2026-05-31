const CACHE_NAME = "broiler-monitor-v1";
const STATIC_ASSETS = [
  "/icon/favicon.svg",
  "/icon/favicon-96x96.png",
  "/icon/web-app-manifest-192x192.png",
  "/icon/web-app-manifest-512x512.png",
];

// Install - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API calls, auth routes, and Next.js internals
  if (request.url.includes("/api/") || request.url.includes("/_next/")) return;

  // For static assets only - cache first
  if (request.url.includes("/icon/") || request.url.includes("/sw.js")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response("Offline", { status: 503 }));
      })
    );
    return;
  }

  // All other requests - network only (don't cache HTML pages)
});
