import {manifest, version} from '@parcel/service-worker';
const VERSION = "v1.0.0beta";
const CACHE_NAME = `aerovisualizer-${VERSION}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/index.html",
    "/manifest.json",
    "/src/css/style.css",
    "/src/js/app.js",
    "/src/js/FontLoader.js",
    "/src/js/OrbitControls.js",
    "/src/js/PoinsotAndCones.js",
    "/src/js/SixDOFObject.js",
    "/src/js/SpecialEllipsoidGeometry.js",
    "/src/js/TextGeometry.js",
    "/src/js/Torquer.js",
    "/src/js/Vectors.js",
    "/static/fonts/helvetiker_bold.typeface.json",
    "/static/fonts/helvetiker_regular.typeface.json",
    "/static/img/blockFaces.jpg",
    "/static/img/cessna172.jpg",
    "/static/img/newHorizons.jpg",
    "/static/img/Jupiter.png",
    "/static/img/stars.jpg",
    "/static/img/sun.png",
    "/static/img/stormydays_bk.jpg",
    "/static/img/stormydays_dn.jpg",
    "/static/img/stormydays_ft.jpg",
    "/static/img/stormydays_lf.jpg",
    "/static/img/stormydays_rt.jpg",
    "/static/img/stormydays_up.jpg",
    "/static/img/icons/1024.png"
  ];




  // async function install() {
  //   const cache = await caches.open(version);
  //   await cache.addAll(manifest);
  // }
  // addEventListener('install', e => e.waitUntil(install()));

  // On install, cache the static resources
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(version);
        await cache.addAll(manifest);
        // const cache = await caches.open(CACHE_NAME);
        // cache.addAll(APP_STATIC_RESOURCES);
      })()
    );
  });


  async function activate() {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(key => key !== version && caches.delete(key))
    );
  }
  self.addEventListener('activate', e => e.waitUntil(activate()));


  // // delete old caches on activate
  // self.addEventListener("activate", (event) => {
  //   event.waitUntil(
  //     (async () => {
  //       const names = await caches.keys();
  //       await Promise.all(
  //         names.map((key) => {
  //           if (key !== version) {
  //           // if (name !== CACHE_NAME) {
  //             return caches.delete(key);
  //           }
  //         })
  //       );
  //       await clients.claim();
  //     })()
  //   );
  // });

  // On fetch, intercept server requests and respond 
  // with cached responses instead of going to network
  self.addEventListener("fetch", (event) => {
    // when seeking an HTML page
    if (event.request.mode === "navigate") {
      // Return to the index.html page
      // event.respondWith(caches.match("/"));
      event.respondWith(cacheThenNetwork(event.request));
      return;
    }
  
    // For every other request type
    event.respondWith(
      (async () => {
        const cache = await caches.open(version);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // Return the cached response if it's available.
          return cachedResponse;
        } else {
          // Respond with a HTTP 404 response status.
          return new Response(null, {status: 404});
        }
      })()
    );
  });




  // async function cacheThenNetwork(request) {
  //   const cachedResponse = await caches.match(request);
  //   if (cachedResponse) {
  //     self.console.log("Found response in cache:", cachedResponse);
  //     return cachedResponse;
  //   }
  //   self.console.log("Falling back to network");
  //   return fetch(request);
  // }
  
  // self.addEventListener("fetch", (event) => {
  //   self.console.log(`Handling fetch event for ${event.request.url}`);
  //   event.respondWith(cacheThenNetwork(event.request));
  // });