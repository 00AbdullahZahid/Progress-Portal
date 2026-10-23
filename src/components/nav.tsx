"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";
import { SearchBox } from "./search-box";
import {
  DashboardIcon,
  TasksIcon,
  HabitsIcon,
  StudyIcon,
  NotesIcon,
  ChatIcon,
  PeopleIcon,
  ShieldIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CardIcon,
  QuestionIcon,
  BookIcon,
  ClassroomIcon,
  TrophyIcon,
  SearchIcon,
  InfoIcon,
} from "./icons";
import { LogoutButton } from "./logout-button";
import { SIDEBAR_EVENT, readCollapsed } from "./shell";
import type { User } from "@prisma/client";

const STORAGE_KEY = "sidebar-collapsed";

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setCollapsed(readCollapsed());
    });
    return () => cancelAnimationFrame(raf);
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

  const links = [
    { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon, mobile: true },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldIcon, mobile: false }] : []),
    { href: "/tasks", label: "Tasks", Icon: TasksIcon, mobile: true },
    { href: "/habits", label: "Habits", Icon: HabitsIcon, mobile: false },
    { href: "/study", label: "Study", Icon: StudyIcon, mobile: true },
    { href: "/notes", label: "Notes", Icon: NotesIcon, mobile: true },
    { href: "/exams", label: "Deadlines", Icon: CalendarIcon, mobile: false },
    { href: "/flashcards", label: "Flashcards", Icon: CardIcon, mobile: false },
    { href: "/questions", label: "Doubts", Icon: QuestionIcon, mobile: false },
    { href: "/resources", label: "Resources", Icon: BookIcon, mobile: false },
    { href: "/timetable", label: "Timetable", Icon: ClassroomIcon, mobile: false },
    { href: "/grades", label: "Grades", Icon: TrophyIcon, mobile: false },
    { href: "/search", label: "Search", Icon: SearchIcon, mobile: true },
    { href: "/chat", label: "Chat", Icon: ChatIcon, mobile: true },
    { href: "/people", label: "People", Icon: PeopleIcon, mobile: false },
    { href: "/guide", label: "Guide", Icon: InfoIcon, mobile: false },
  ];

  const isCollapsed = mounted ? collapsed : false;
  const width = isCollapsed ? "md:w-[76px]" : "md:w-60";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${width}`}
      >
        {/* Header / brand + toggle */}
        <div className="flex h-16 items-center px-3">
          {isCollapsed ? (
            <button
              onClick={toggle}
              aria-label="Expand sidebar"
              className="mx-auto rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <ChevronRightIcon />
            </button>
          ) : (
            <>
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <BarChartIcon width={18} height={18} />
                </span>
                <span className="text-lg font-bold tracking-tight">Group Portal</span>
              </Link>
              <button
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="ml-auto rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <ChevronLeftIcon />
              </button>
            </>
          )}
        </div>

        {!isCollapsed ? (
          <div className="px-3 pb-2">
            <SearchBox />
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2">
          {links.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className={`flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                <Icon width={20} height={20} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{label}</span>}
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
              <LogoutButton collapsed />
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
                    {isAdmin ? "Super Admin" : "Settings"}
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted">Theme</span>
                <ThemeToggle />
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <span className="font-bold">Group Portal</span>
        <SearchBox className="max-w-[10rem] flex-1" />
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <Link
              href="/admin"
              aria-label="Admin dashboard"
              className="rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <ShieldIcon />
            </Link>
          ) : null}
          <ThemeToggle />
          <Link href="/settings">
            <Avatar user={user} size="sm" />
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-surface/95 py-1.5 backdrop-blur md:hidden">
        {links
          .filter((l) => l.mobile)
          .map(({ href, label, Icon }) => {
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
