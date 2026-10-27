"use client";

import { useEffect } from "react";

const LIGHT_ICON = "/icon-light-192.png";
const DARK_ICON = "/icon-dark-192.png";

/**
 * Keep the browser-tab / bookmark icon in sync with the app theme.
 *
 * The theme can be forced to light or dark in Settings, which may differ from
 * the operating system, so a CSS media query alone is not enough. Metadata
 * supplies both files; this swaps every icon link to the active one.
 */
export function AppIcon() {
  useEffect(() => {
    function apply() {
      const dark = document.documentElement.classList.contains("dark");
      const href = dark ? DARK_ICON : LIGHT_ICON;
      document
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
        .forEach((link) => {
          // Drop the system media query so the stored app theme wins.
          link.removeAttribute("media");
          if (link.type !== "image/svg+xml") link.href = href;
        });
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
