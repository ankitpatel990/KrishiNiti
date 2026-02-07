/**
 * FarmHelp Service Worker
 *
 * Provides offline caching for static assets and API responses.
 * Uses a cache-first strategy for static assets and a network-first
 * strategy for API calls (with fallback to cache when offline).
 */

const CACHE_NAME = "farmhelp-v1";
const STATIC_CACHE = "farmhelp-static-v1";
const API_CACHE = "farmhelp-api-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
];

// ---------------------------------------------------------------------------
// Install - Pre-cache critical assets
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate - Clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !allowedCaches.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch - Routing strategy
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Offline", detail: "No cached data available." }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
