const IMG_CACHE = "entity-ledger-portraits-v1";
const FONT_CACHE = "entity-ledger-fonts-v1";
const IMAGE_HOSTS = ["deadbydaylight.wiki.gg"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (IMAGE_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(IMG_CACHE, request));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(FONT_CACHE, request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "PRECACHE" && Array.isArray(event.data.urls)) {
    event.waitUntil(caches.open(IMG_CACHE).then((cache) =>
      Promise.all(event.data.urls.map(async (u) => {
        if (await cache.match(u)) return;
        try { cache.put(u, await fetch(u, { mode: "no-cors" })); } catch (_) { /* offline */ }
      }))
    ));
  }
});
