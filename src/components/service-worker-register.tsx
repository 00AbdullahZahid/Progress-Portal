"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so static assets load fast and there is an
 * offline page. Signed-in HTML is never cached (see public/sw.js).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
