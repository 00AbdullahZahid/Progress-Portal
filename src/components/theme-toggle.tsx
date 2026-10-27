"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";
import { THEME_EVENT, saveTheme } from "./theme-control";

/**
 * One-tap light/dark switch for the top bar and sign-in screen. The full
 * Light/Dark/System choice lives in Settings > Appearance.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains("dark"));
    // Defer to the next frame so we never set state during the effect body.
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      read();
    });
    window.addEventListener(THEME_EVENT, read);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(THEME_EVENT, read);
    };
  }, []);

  function toggle() {
    const nextDark = !document.documentElement.classList.contains("dark");
    saveTheme(nextDark ? "dark" : "light");
  }

  const label = !mounted
    ? "Toggle theme"
    : dark
      ? "Switch to light theme"
      : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${className}`}
    >
      {mounted && dark ? (
        <SunIcon width={19} height={19} />
      ) : (
        <MoonIcon width={19} height={19} />
      )}
    </button>
  );
}
