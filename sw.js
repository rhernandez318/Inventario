// Service Worker — Inventario ABC
const CACHE_NAME = 'inventario-v3';
const STATIC_ASSETS = [
  './login.html',
  './dashboard.html',
  './upload.html',
  './reset.html',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

// Install: cache static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.warn('SW: some assets failed to cache', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', function(e) {
  // Skip non-GET and Supabase API calls (always need network)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache successful responses for static assets
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed → serve from cache
        return caches.match(e.request).then(function(cached) {
          return cached || new Response(
            '<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#d4a853">Sin conexión · Inventario ABC</h2>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});
