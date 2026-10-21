"use client";

import { useEffect, useState } from "react";
import { Nav } from "./nav";
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
    setMounted(true);
    setCollapsed(readCollapsed());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(detail);
    };
    window.addEventListener(SIDEBAR_EVENT, onChange);
    return () => window.removeEventListener(SIDEBAR_EVENT, onChange);
  }, []);

  const isCollapsed = mounted ? collapsed : false;

  return (
    <div className="min-h-dvh">
      <Nav user={user} />
      <main
        className={`mx-auto max-w-5xl px-4 pb-24 pt-6 transition-[margin] duration-200 md:pb-10 md:pr-6 ${
          isCollapsed ? "md:ml-[76px]" : "md:ml-60"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
