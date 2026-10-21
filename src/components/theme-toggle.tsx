"use client";

import { useCallback, useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

const THEME_EVENT = "theme-change";

/** Read the current theme directly from the DOM (single source of truth). */
function isDarkNow(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer to the next tick so we never set state during the effect body.
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setDark(isDarkNow());
    });
    const onChange = () => setDark(isDarkNow());
    window.addEventListener(THEME_EVENT, onChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(THEME_EVENT, onChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !isDarkNow();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink"
    >
      {mounted && dark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
