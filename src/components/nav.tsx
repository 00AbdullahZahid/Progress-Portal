"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DashboardIcon,
  TasksIcon,
  StudyIcon,
  BookIcon,
  ChatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons";
import { SIDEBAR_EVENT, readCollapsed, type ShellCounts, type ShellUser } from "./shell";
import { SidebarLogo } from "./sidebar-logo";

const STORAGE_KEY = "sidebar-collapsed";

type NavLink = {
  href: string;
  label: string;
  Icon: typeof DashboardIcon;
  /** Extra paths that belong to this tab (e.g. /exams belongs to Work). */
  match: string[];
};

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Home", Icon: DashboardIcon, match: ["/dashboard"] },
  {
    href: "/tasks",
    label: "Work",
    Icon: TasksIcon,
    match: ["/tasks", "/exams", "/timetable"],
  },
  { href: "/study", label: "Study", Icon: StudyIcon, match: ["/study", "/habits"] },
  {
    href: "/notes",
    label: "Library",
    Icon: BookIcon,
    match: ["/notes", "/resources", "/questions", "/flashcards"],
  },
  { href: "/chat", label: "Chat", Icon: ChatIcon, match: ["/chat"] },
];

function isActive(pathname: string, link: NavLink): boolean {
  return link.match.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-2 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-surface"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Nav({
  user,
  counts,
}: {
  user: ShellUser;
  counts: ShellCounts;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setCollapsed(readCollapsed());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: next }));
      return next;
    });
  }

  function countFor(href: string): number {
    if (href === "/chat") return counts.chatUnread;
    if (href === "/tasks") return counts.tasksDueToday;
    return 0;
  }

  const isCollapsed = mounted ? collapsed : false;
  const width = isCollapsed ? "md:w-[76px]" : "md:w-60";

  return (
    <>
      {/* Desktop sidebar: five primary destinations only. Sub-pages live in
          the section tabs, and personal links live in the avatar menu. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${width}`}
      >
        <div className="flex h-16 shrink-0 items-center px-3">
          {isCollapsed ? (
            <button
              onClick={toggle}
              aria-label="Expand sidebar"
              className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <ChevronRightIcon />
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <SidebarLogo size={32} />
                <span className="truncate text-lg font-bold tracking-tight">
                  Group Portal
                </span>
              </Link>
              <button
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="ml-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <ChevronLeftIcon />
              </button>
            </>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {LINKS.map((link) => {
            const active = isActive(pathname, link);
            const count = countFor(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={isCollapsed ? link.label : undefined}
                aria-label={isCollapsed ? link.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3 py-2"
                } ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                <span className="relative shrink-0">
                  <link.Icon width={20} height={20} />
                  <Badge count={count} />
                </span>
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border px-3 py-3">
          <p
            className={`truncate text-xs text-muted ${isCollapsed ? "text-center" : "px-2"}`}
            title={user.name}
          >
            {isCollapsed ? "" : user.name}
          </p>
        </div>
      </aside>

      {/* Mobile bottom navigation: exactly the five primary tabs. */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pt-1 backdrop-blur md:hidden">
        {LINKS.map((link) => {
          const active = isActive(pathname, link);
          const count = countFor(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              aria-label={
                count > 0
                  ? `${link.label}, ${count} ${link.href === "/chat" ? "unread" : "due"}`
                  : link.label
              }
              className={`tap flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <span className="relative">
                <link.Icon width={20} height={20} />
                <Badge count={count} />
              </span>
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
