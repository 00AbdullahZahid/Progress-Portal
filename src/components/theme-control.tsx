"use client";

import { useEffect, useState } from "react";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "./icons";

export type Theme = "light" | "dark" | "system";

export type Accent =
  | "blue"
  | "indigo"
  | "violet"
  | "emerald"
  | "teal"
  | "amber"
  | "rose"
  | "slate";

export const THEME_EVENT = "theme-change";
const THEME_KEY = "theme";
const ACCENT_KEY = "theme-accent";

const ACCENTS: Array<{ value: Accent; label: string; swatch: string }> = [
  { value: "blue", label: "Blue", swatch: "#2563eb" },
  { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { value: "violet", label: "Violet", swatch: "#7c3aed" },
  { value: "emerald", label: "Emerald", swatch: "#047857" },
  { value: "teal", label: "Teal", swatch: "#0f766e" },
  { value: "amber", label: "Amber", swatch: "#b45309" },
  { value: "rose", label: "Rose", swatch: "#be123c" },
  { value: "slate", label: "Slate", swatch: "#475569" },
];

const ACCENT_VALUES = ACCENTS.map((accent) => accent.value);

function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && ACCENT_VALUES.includes(value as Accent);
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage blocked: fall back to the system preference.
  }
  return "system";
}

function readAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (isAccent(stored)) return stored;
  } catch {
    // Storage blocked: keep the default accent.
  }
  return "blue";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply a theme mode and notify every mounted theme control. */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Apply an accent by swapping the `data-accent` attribute. The actual colour
 * values live in globals.css so light and dark variants are pure CSS and the
 * accent survives a mode change without a flash.
 */
function applyAccent(accent: Accent) {
  if (accent === "blue") {
    document.documentElement.removeAttribute("data-accent");
  } else {
    document.documentElement.setAttribute("data-accent", accent);
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  applyTheme(theme);
}

function saveAccent(accent: Accent) {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  applyAccent(accent);
}

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof SunIcon }> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

export function ThemeControl({
  className = "",
  showLabels = false,
}: {
  className?: string;
  showLabels?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setTheme(readTheme());
    });
    const sync = () => setTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    window.addEventListener(THEME_EVENT, sync);
    media.addEventListener("change", onSystemChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    saveTheme(next);
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface2 p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              showLabels
                ? "px-3 text-sm font-medium"
                : "min-w-11 px-2 md:min-h-8 md:min-w-8 md:px-1.5"
            } ${active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            <Icon width={15} height={15} />
            {showLabels ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function AccentControl({ className = "" }: { className?: string }) {
  const [accent, setAccent] = useState<Accent>("blue");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setAccent(readAccent());
    });
    const sync = () => setAccent(readAccent());
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  function choose(next: Accent) {
    setAccent(next);
    saveAccent(next);
  }

  return (
    <div
      role="group"
      aria-label="Accent color"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {ACCENTS.map((option) => {
        const active = mounted && accent === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-pressed={active}
            aria-label={`${option.label} accent`}
            title={`${option.label} accent`}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-transform focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none ${
              active
                ? "border-brand ring-2 ring-brand/30"
                : "border-border hover:scale-105"
            }`}
          >
            <span
              aria-hidden="true"
              className="h-7 w-7 rounded-full"
              style={{ backgroundColor: option.swatch }}
            />
            {active ? (
              <CheckIcon
                width={15}
                height={15}
                className="absolute text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

