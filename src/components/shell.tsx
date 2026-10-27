"use client";

import { useEffect, useState } from "react";
import { Nav } from "./nav";
import { TopBar } from "./top-bar";
import { Tutorial } from "./tutorial";
import { CHAT_READ_EVENT } from "@/lib/events";
import { DEVICE_NOTIFY_EVENT, syncScheduledReminders } from "@/lib/device-notifications";
import type { PublicUser } from "@/lib/user";

const STORAGE_KEY = "sidebar-collapsed";
export const SIDEBAR_EVENT = "sidebar-toggle";

/** The only user fields the client shell needs. Keep password/token server-side. */
export type ShellUser = Pick<
  PublicUser,
  "id" | "name" | "role" | "color" | "image"
>;

export type ShellCounts = {
  chatUnread: number;
  tasksDueToday: number;
};

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Shell({
  user,
  counts,
  children,
}: {
  user: ShellUser;
  counts: ShellCounts;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chatUnread, setChatUnread] = useState(counts.chatUnread);

  useEffect(() => {
    // Defer to the next frame so we never set state during the effect body.
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setCollapsed(readCollapsed());
    });
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(detail);
    };
    window.addEventListener(SIDEBAR_EVENT, onChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(SIDEBAR_EVENT, onChange);
    };
  }, []);

  useEffect(() => {
    const clear = () => setChatUnread(0);
    window.addEventListener(CHAT_READ_EVENT, clear);
    return () => window.removeEventListener(CHAT_READ_EVENT, clear);
  }, []);

  // Schedule (or refresh) on-device due/exam reminders once a day. The helper
  // no-ops outside the Android bridge, so browsers are unaffected.
  useEffect(() => {
    const sync = () => void syncScheduledReminders();
    const timer = window.setTimeout(sync, 2500);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener(DEVICE_NOTIFY_EVENT, sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(DEVICE_NOTIFY_EVENT, sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const isCollapsed = mounted ? collapsed : false;

  return (
    <div className="min-h-dvh">
      <Nav
        user={user}
        counts={{ ...counts, chatUnread }}
      />
      <div
        className={`min-w-0 transition-[margin] duration-200 ${
          isCollapsed ? "md:ml-[76px]" : "md:ml-60"
        }`}
      >
        <TopBar user={user} />
        <main className="min-w-0 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <Tutorial />
    </div>
  );
}
