/* DANSHA Learning — service worker : l'app fonctionne entièrement hors ligne.
   Changez VERSION à chaque mise à jour importante pour forcer le renouvellement du cache. */
const VERSION = "dansha-v2";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon.svg", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("dansha-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache d'abord (instantané, marche sans réseau), puis mise à jour silencieuse en arrière-plan. */
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const nav = r.mode === "navigate";
  const key = nav ? "./index.html" : r;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(r).then(res => {
      if (res && res.ok && res.type === "basic" && !res.redirected) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    return nav ? (await cache.match("./index.html")) || Response.error() : Response.error();
  })());
});
