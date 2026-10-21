"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";
import {
  DashboardIcon,
  TasksIcon,
  HabitsIcon,
  StudyIcon,
  ChatIcon,
  PeopleIcon,
  SettingsIcon,
  LogoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons";
import { signOut } from "@/lib/actions/auth";
import { SIDEBAR_EVENT, readCollapsed } from "./shell";
import type { User } from "@prisma/client";

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/tasks", label: "Tasks", Icon: TasksIcon },
  { href: "/habits", label: "Habits", Icon: HabitsIcon },
  { href: "/study", label: "Study", Icon: StudyIcon },
  { href: "/chat", label: "Chat", Icon: ChatIcon },
  { href: "/people", label: "People", Icon: PeopleIcon },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(readCollapsed());
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: next }));
      return next;
    });
  }

  const isCollapsed = mounted ? collapsed : false;
  const width = isCollapsed ? "md:w-[76px]" : "md:w-60";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${width}`}
      >
        <div
          className={`mb-6 flex items-center gap-2 px-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight">Group Portal</span>
          )}
          <button
            onClick={toggle}
            aria-label="Toggle sidebar"
            className={`rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink ${
              isCollapsed ? "" : "ml-auto"
            }`}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                <Icon width={20} height={20} />
                {!isCollapsed && label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border p-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link href="/settings" title="Settings">
                <Avatar user={user} size="md" />
              </Link>
              <ThemeToggle />
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                >
                  <LogoutIcon />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface2"
              >
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted">
                    {user.role === "admin" ? "Super Admin" : "Settings"}
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted">Theme</span>
                <ThemeToggle />
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                >
                  <LogoutIcon width={20} height={20} />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <span className="font-bold">Group Portal</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/settings">
            <Avatar user={user} size="sm" />
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-surface/95 py-1.5 backdrop-blur md:hidden">
        {links.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <Icon width={20} height={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
