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
  MenuIcon,
  XIcon,
} from "./icons";
import { LogoutButton } from "./logout-button";
import { SIDEBAR_EVENT, readCollapsed, type ShellUser } from "./shell";
import { useBodyLock } from "./toast";

const STORAGE_KEY = "sidebar-collapsed";

export function Nav({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === "admin";

  useBodyLock(menuOpen);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setCollapsed(readCollapsed());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close the mobile menu with Escape, or when the viewport grows to desktop
  // (otherwise its body-scroll lock would linger behind the desktop sidebar).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onChange);
    };
  }, [menuOpen]);

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

  function closeMenu() {
    setMenuOpen(false);
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
    { href: "/search", label: "Search", Icon: SearchIcon, mobile: false },
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
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur md:hidden">
        <Link
          href="/dashboard"
          aria-label="Dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white"
        >
          <BarChartIcon width={18} height={18} />
        </Link>
        <SearchBox className="min-w-0 flex-1" />
        <Link
          href="/settings"
          aria-label="Settings"
          className="shrink-0 rounded-xl p-1.5 transition-colors hover:bg-surface2"
        >
          <Avatar user={user} size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open all pages"
          aria-expanded={menuOpen}
          className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink"
        >
          <MenuIcon width={20} height={20} />
        </button>
      </header>

      {/* Mobile bottom nav: five main pages plus a link to everything else. */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pt-1.5 backdrop-blur md:hidden">
        {links
          .filter((l) => l.mobile)
          .map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon width={20} height={20} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open all pages"
          aria-expanded={menuOpen}
          className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium text-muted"
        >
          <MenuIcon width={20} height={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile menu sheet */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All pages"
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-border bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <BarChartIcon width={18} height={18} />
                </span>
                <span className="truncate font-bold">Group Portal</span>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <XIcon width={18} height={18} />
              </button>
            </div>

            <div className="safe-bottom flex-1 overflow-y-auto p-3">
              <SearchBox />

              <nav className="mt-3 grid grid-cols-2 gap-1">
                {links.map(({ href, label, Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-brand-soft text-brand"
                          : "text-muted hover:bg-surface2 hover:text-ink"
                      }`}
                    >
                      <Icon width={18} height={18} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
                <Link
                  href="/settings"
                  onClick={closeMenu}
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
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-medium text-muted">Theme</span>
                  <ThemeToggle />
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
