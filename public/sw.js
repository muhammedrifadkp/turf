// TurfArena PWA Service Worker (Online-Only)
// Configured to fulfill PWA installation criteria while executing direct network pass-throughs.

const CACHE_NAME = 'turfarena-v1';

self.addEventListener('install', (event) => {
  // Activate immediately upon installation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open pages immediately
  event.waitUntil(self.clients.claim());
});

// Online-only network pass-through fetch handler
self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to network without offline caching
  event.respondWith(fetch(event.request));
});
