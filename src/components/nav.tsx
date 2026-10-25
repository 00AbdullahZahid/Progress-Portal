"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "./notification-bell";
import { ProfileMenu } from "./profile-menu";
import { SearchBox } from "./search-box";
import { ThemeControl, ThemeCycle } from "./theme-control";
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
  SettingsIcon,
  InfoIcon,
  MenuIcon,
  XIcon,
} from "./icons";
import { SIDEBAR_EVENT, readCollapsed, type ShellUser } from "./shell";
import { useBodyLock } from "./toast";

const STORAGE_KEY = "sidebar-collapsed";

type NavLink = {
  href: string;
  label: string;
  Icon: typeof DashboardIcon;
  mobile?: boolean;
};

const SECTIONS: Array<{ label: string; links: NavLink[] }> = [
  {
    label: "Plan",
    links: [
      { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon, mobile: true },
      { href: "/tasks", label: "Tasks", Icon: TasksIcon, mobile: true },
      { href: "/exams", label: "Deadlines", Icon: CalendarIcon },
      { href: "/timetable", label: "Timetable", Icon: ClassroomIcon },
    ],
  },
  {
    label: "Study",
    links: [
      { href: "/study", label: "Study", Icon: StudyIcon, mobile: true },
      { href: "/notes", label: "Notes", Icon: NotesIcon, mobile: true },
      { href: "/flashcards", label: "Flashcards", Icon: CardIcon },
      { href: "/questions", label: "Doubts", Icon: QuestionIcon },
      { href: "/resources", label: "Resources", Icon: BookIcon },
    ],
  },
  {
    label: "Track",
    links: [
      { href: "/habits", label: "Habits", Icon: HabitsIcon },
      { href: "/grades", label: "Grades", Icon: TrophyIcon },
    ],
  },
  {
    label: "Group",
    links: [
      { href: "/chat", label: "Chat", Icon: ChatIcon, mobile: true },
      { href: "/people", label: "People", Icon: PeopleIcon },
      { href: "/search", label: "Search", Icon: SearchIcon },
    ],
  },
];

const MOBILE_LINKS = SECTIONS.flatMap((section) => section.links).filter(
  (link) => link.mobile
);

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

  const isCollapsed = mounted ? collapsed : false;
  const width = isCollapsed ? "md:w-[76px]" : "md:w-60";

  function renderLink(link: NavLink, mobileGrid = false) {
    const { href, label, Icon } = link;
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        title={isCollapsed && !mobileGrid ? label : undefined}
        aria-label={isCollapsed && !mobileGrid ? label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={mobileGrid ? closeMenu : undefined}
        className={`flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          mobileGrid ? "gap-2 px-2.5 py-2" : isCollapsed ? "justify-center px-0" : "gap-3 px-3 py-2"
        } ${
          active
            ? "bg-brand-soft text-brand"
            : "text-muted hover:bg-surface2 hover:text-ink"
        }`}
      >
        <Icon width={20} height={20} className="shrink-0" />
        {(!isCollapsed || mobileGrid) && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  function footerLink(href: string, label: string, Icon: typeof InfoIcon) {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        title={isCollapsed ? label : undefined}
        aria-label={isCollapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5 py-2"
        } ${
          active
            ? "bg-brand-soft text-brand"
            : "text-muted hover:bg-surface2 hover:text-ink"
        }`}
      >
        <Icon width={18} height={18} className="shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${width}`}
      >
        {/* Header / brand, notifications, toggle */}
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
              <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <BarChartIcon width={18} height={18} />
                </span>
                <span className="truncate text-lg font-bold tracking-tight">Group Portal</span>
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <NotificationBell />
                <button
                  onClick={toggle}
                  aria-label="Collapse sidebar"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <ChevronLeftIcon />
                </button>
              </div>
            </>
          )}
        </div>

        {!isCollapsed ? (
          <div className="px-3 pb-2">
            <SearchBox />
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-2">
          {SECTIONS.map((section, index) => (
            <div key={section.label}>
              {isCollapsed ? (
                index > 0 ? <div className="mx-2 mb-1 border-t border-border" /> : null
              ) : (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/80">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.links.map((link) => renderLink(link))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          {isAdmin ? footerLink("/admin", "Admin", ShieldIcon) : null}
          {footerLink("/settings", "Settings", SettingsIcon)}
          {footerLink("/guide", "Guide", InfoIcon)}

          {isCollapsed ? (
            <div className="mt-2 flex flex-col items-center gap-1 border-t border-border pt-2">
              <NotificationBell />
              <ThemeCycle />
              <ProfileMenu user={user} collapsed />
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border px-2 pt-3">
                <span className="text-xs text-muted">Theme</span>
                <ThemeControl />
              </div>
              <div className="mt-2">
                <ProfileMenu user={user} />
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-1.5 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur md:hidden">
        <Link
          href="/dashboard"
          aria-label="Dashboard"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white"
        >
          <BarChartIcon width={18} height={18} />
        </Link>
        <SearchBox className="min-w-0 flex-1" />
        <NotificationBell />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open all pages"
          aria-expanded={menuOpen}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink"
        >
          <MenuIcon width={20} height={20} />
        </button>
      </header>

      {/* Mobile bottom nav: five main pages plus a link to everything else. */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pt-1.5 backdrop-blur md:hidden">
        {MOBILE_LINKS.map(({ href, label, Icon }) => {
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
              <div className="flex items-center gap-0.5">
                <NotificationBell />
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <XIcon width={18} height={18} />
                </button>
              </div>
            </div>

            <div className="safe-bottom flex-1 overflow-y-auto p-3">
              <SearchBox />

              <div className="mt-4 flex flex-col gap-4">
                {SECTIONS.map((section) => (
                  <section key={section.label}>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/80">
                      {section.label}
                    </p>
                    <nav className="grid grid-cols-2 gap-1">
                      {section.links.map((link) => renderLink(link, true))}
                    </nav>
                  </section>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
                {isAdmin ? (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                  >
                    <ShieldIcon width={18} height={18} />
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/settings"
                  onClick={closeMenu}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <SettingsIcon width={18} height={18} />
                  Settings
                </Link>
                <Link
                  href="/guide"
                  onClick={closeMenu}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <InfoIcon width={18} height={18} />
                  Guide
                </Link>
                <div className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="text-sm font-medium text-muted">Theme</span>
                  <ThemeControl />
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <ProfileMenu user={user} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
