import {manifest, version} from '@parcel/service-worker';
const VERSION = "v1.0.40beta";
const CACHE_NAME = `aerovisualizer-${VERSION}`;

// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      self.console.log("version ---------",VERSION);
      const cache = await caches.open(VERSION);
      await cache.addAll(manifest);
    })()
  );
});

async function activate() {
  const keys = await caches.keys();
  await Promise.all(
    keys.map(key => key !== VERSION && caches.delete(key))
  );
}
self.addEventListener('activate', e => e.waitUntil(activate()));

self.addEventListener('fetch', (event) => {
  // Check if this is a request for an image
  event.respondWith(caches.open(CACHE_NAME).then( (cache) => {
    // Go to the cache first
    return cache.match(event.request.url).then((cachedResponse) => {
      // Return a cached response if we have one
      // self.console.log(event.request.url);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, hit the network
      return fetch(event.request).then((fetchedResponse) => {
        // Add the network response to the cache for later visits
        cache.put(event.request, fetchedResponse.clone());

        // Return the network response
        return fetchedResponse;
      });
    });
  }));
});
