"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";
import { LogoutButton } from "./logout-button";
import { ThemeControl } from "./theme-control";
import { InfoIcon, SettingsIcon } from "./icons";
import type { ShellUser } from "./shell";

/**
 * The profile avatar in the page top bar. Settings, the guide, theme, and sign
 * out live here so the sidebar footer can stay short.
 */
export function ProfileMenu({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${user.name} profile menu`}
        title={`${user.name} — profile menu`}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors hover:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Avatar user={user} size="sm" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label="Profile"
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-3 py-3">
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">
                  {user.role === "admin" ? "Super Admin" : "Member"}
                </p>
              </div>
            </div>
            <div className="p-1">
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface2 focus-visible:bg-surface2 focus-visible:outline-none"
              >
                <SettingsIcon width={16} height={16} className="text-muted" />
                Settings
              </Link>
              <Link
                href="/guide"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface2 focus-visible:bg-surface2 focus-visible:outline-none"
              >
                <InfoIcon width={16} height={16} className="text-muted" />
                Guide
              </Link>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="text-sm">Theme</span>
                <ThemeControl />
              </div>
              <div className="my-1 border-t border-border" />
              <LogoutButton />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
