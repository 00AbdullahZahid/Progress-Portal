"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";
import { LogoutButton } from "./logout-button";
import { ChevronRightIcon, SettingsIcon } from "./icons";
import type { ShellUser } from "./shell";

export function ProfileMenu({
  user,
  collapsed = false,
}: {
  user: ShellUser;
  collapsed?: boolean;
}) {
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${user.name} profile menu`}
        title={collapsed ? user.name : undefined}
        className={`flex w-full items-center rounded-xl transition-colors hover:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          collapsed ? "justify-center p-1.5" : "gap-2.5 p-2"
        }`}
      >
        <Avatar user={user} size={collapsed ? "md" : "sm"} />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-[11px] text-muted">
                {user.role === "admin" ? "Super Admin" : "Member"}
              </span>
            </span>
            <ChevronRightIcon width={15} height={15} className="text-muted" />
          </>
        ) : null}
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
            className={`absolute bottom-full z-50 mb-2 w-52 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl ${
              collapsed ? "left-0" : "left-0 right-0 w-auto"
            }`}
          >
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface2 focus-visible:bg-surface2 focus-visible:outline-none"
            >
              <SettingsIcon width={16} height={16} className="text-muted" />
              Settings
            </Link>
            <div className="my-1 border-t border-border" />
            <LogoutButton />
          </div>
        </>
      ) : null}
    </div>
  );
}
