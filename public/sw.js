// Service worker for the Group Portal.
//
// Privacy note: signed-in HTML is never cached, because a cached page would
// survive logout and could be read offline on a shared computer. Only static
// assets (scripts, styles, fonts, images) are cached, plus a small offline
// fallback page.
const CACHE = "portal-static-v1";
const OFFLINE_URL = "/offline.html";

// Private pages whose HTML must never be stored, even as a fallback.
const PRIVATE_PREFIXES = ["/grades", "/settings", "/admin", "/chat"];

function isPrivate(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Let the app clear caches on logout so nothing is left behind.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never touch the API, Next data/action requests, or private pages.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    isPrivate(url.pathname)
  ) {
    return;
  }

  // Only static assets are cached. Documents are excluded so no signed-in HTML
  // is ever written to disk.
  const isStatic =
    req.destination === "script" ||
    req.destination === "style" ||
    req.destination === "font" ||
    req.destination === "image";

  if (!isStatic) {
    // Network-first for documents with a generic offline page as the fallback.
    if (req.destination === "document") {
      event.respondWith(
        fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
      );
    }
    return;
  }

  // Cache-first for immutable static assets.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
