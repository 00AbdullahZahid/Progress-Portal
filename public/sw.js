// Service worker for the Group Portal.
//
// Privacy note: signed-in HTML is never cached, because a cached page would
// survive logout and could be read offline on a shared computer. Only static
// assets (scripts, styles, fonts, images) are cached, plus a small offline
// fallback page.
const CACHE = "portal-static-v2";
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

// Browser push notifications. The payload is produced by src/lib/push.ts.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = typeof data.title === "string" ? data.title : "Group Portal";
  const body = typeof data.body === "string" ? data.body : "";
  const href = typeof data.href === "string" ? data.href : "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : "portal",
      data: { href },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested =
    event.notification.data && typeof event.notification.data.href === "string"
      ? event.notification.data.href
      : "/dashboard";

  let url;
  try {
    const resolved = new URL(requested, self.location.origin);
    url = resolved.origin === self.location.origin ? resolved.href : self.location.origin + "/dashboard";
  } catch {
    url = self.location.origin + "/dashboard";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
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
