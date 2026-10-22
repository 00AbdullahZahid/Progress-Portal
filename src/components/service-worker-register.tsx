"use client";

import { useEffect } from "react";

/** Registers the service worker so the app works offline once installed. */
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
