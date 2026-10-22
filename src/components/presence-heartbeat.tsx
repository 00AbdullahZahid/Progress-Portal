"use client";

import { useEffect } from "react";
import { pingPresence } from "@/lib/actions/presence";

/**
 * Sends a presence heartbeat once on mount and every few minutes, so the group
 * can see who is currently active. Failures are ignored.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;
    const beat = () => {
      if (cancelled) return;
      void pingPresence().catch(() => {});
    };
    // Defer the first beat a frame so we never call during the effect body.
    const raf = requestAnimationFrame(beat);
    const id = setInterval(beat, 3 * 60 * 1000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  return null;
}
