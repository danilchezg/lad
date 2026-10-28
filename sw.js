// Лад service worker: keeps the whole app (shell, fonts, scripts) available offline.
const VERSION = "__VERSION__";
const CACHE = "lad-" + VERSION;
const FILES = __FILES__;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("lad-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // API calls etc. go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && url.pathname.match(/\.(json|woff2|png|js|css|html|webmanifest)$/)) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === "navigate") return (await cache.match("./")) || (await cache.match("index.html"));
      throw err;
    }
  })());
});
