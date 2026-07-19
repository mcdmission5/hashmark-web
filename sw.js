// Hashmark service worker — caches the app shell for offline + instant repeat loads.
// Strategy:
//   • App shell (same-origin index/manifest/icons): cache-first, revalidate in background.
//   • Navigations: serve cached index.html when offline (SPA fallback).
//   • Everything cross-origin (Supabase REST data, Google Fonts): straight to the network
//     (never cache live ratings — data freshness wins). Fonts get an opportunistic cache.
const VERSION = "hashmark-v25";   // v25: team-page accordions + example tooltips + history stack + What Wins + season rollover
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // SPA navigation: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // The HTML document itself: network-first, so returning visitors always get the latest home
  // (the stats dashboard) instead of a stale cached shell. Falls back to cache when offline.
  if (sameOrigin && (url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Same-origin shell assets: cache-first with background revalidate.
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Google Fonts: opportunistic stale-while-revalidate so the UI font survives offline.
  if (url.host.includes("fonts.googleapis.com") || url.host.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // Everything else (Supabase live data): straight to the network, no caching.
});


// ---- P2-E6: web push (self-hosted VAPID). Payloads are Declarative-Web-Push-shaped;
// this handler renders them on platforms that don't parse them natively. ----
self.addEventListener("push", (e) => {
  let n = {};
  try { n = (e.data.json() || {}).notification || {}; } catch (_) { n = { title: "Hashmark", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(n.title || "Hashmark", {
    body: n.body || "", icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
    data: { url: n.navigate || "https://hash-mark.com/#pickem" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "https://hash-mark.com/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if (w.url.startsWith("https://hash-mark.com")) { w.focus(); w.navigate(url); return; } }
    return clients.openWindow(url);
  }));
});
