"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark" | "system";

const THEME_EVENT = "theme-change";
const STORAGE_KEY = "theme";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event(THEME_EVENT));
}

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof SunIcon }> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

export function ThemeControl({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setTheme(readTheme());
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", onSystemChange);
    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
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
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none md:min-h-8 md:min-w-8 md:px-1.5 ${
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <Icon width={15} height={15} />
          </button>
        );
      })}
    </div>
  );
}

/** Compact one-button version for the collapsed sidebar. */
export function ThemeCycle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setTheme(readTheme());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const Icon = current.Icon;

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current.label}. Click to change.`}
      title={`Theme: ${current.label}`}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${className}`}
    >
      {mounted ? <Icon width={19} height={19} /> : <MonitorIcon width={19} height={19} />}
    </button>
  );
}
