// Offline cache for the Cessna 152 Checklist.
// Strategy: serve from cache immediately when available (fast + works with
// no connection), and refresh the cache from the network in the background
// whenever it's reachable.
var CACHE_NAME = "c152-checklist-v1";

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([
        self.registration.scope,
        "manifest.json",
        "apple-touch-icon.png"
      ]).catch(function () {
        // Even if a secondary asset fails to precache, don't block install.
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.add(self.registration.scope);
        });
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () { return cached; });

      return cached || network;
    })
  );
});
