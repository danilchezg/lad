// Лад service worker: keeps the whole app (shell, fonts, scripts) available offline.
const VERSION = "10147d9537";
const CACHE = "lad-" + VERSION;
const FILES = ["./", "fonts/manrope-cyrillic-400-normal.woff2", "fonts/manrope-cyrillic-600-normal.woff2", "fonts/manrope-cyrillic-800-normal.woff2", "fonts/manrope-latin-400-normal.woff2", "fonts/manrope-latin-600-normal.woff2", "fonts/manrope-latin-800-normal.woff2", "fonts/onest-cyrillic-500-normal.woff2", "fonts/onest-cyrillic-700-normal.woff2", "fonts/onest-latin-500-normal.woff2", "fonts/onest-latin-700-normal.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512-maskable.png", "icons/icon-512.png", "index.html", "js/app.js", "js/audio.js", "js/content-drums.js", "js/content-fret.js", "js/content-guitar.js", "js/content-keys.js", "js/content-rhythm.js", "js/content-styles.js", "js/content-theory.js", "js/core.js", "js/games.js", "js/harmony.js", "js/theory.js", "js/tools.js", "js/widgets.js", "manifest.webmanifest", "style.css"];

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
