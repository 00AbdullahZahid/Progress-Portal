"use client";

import { useEffect, useState } from "react";
import { Nav } from "./nav";
import { Tutorial } from "./tutorial";
import type { User } from "@prisma/client";

const STORAGE_KEY = "sidebar-collapsed";
export const SIDEBAR_EVENT = "sidebar-toggle";

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const isCollapsed = mounted ? collapsed : false;

  return (
    <div className="min-h-dvh">
      <Nav user={user} />
      <main
        className={`px-4 pb-24 pt-6 transition-[margin] duration-200 md:px-8 md:pb-10 ${
          isCollapsed ? "md:ml-[76px]" : "md:ml-60"
        }`}
      >
        {children}
      </main>
      <Tutorial />
    </div>
  );
}
