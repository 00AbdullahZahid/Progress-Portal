"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "./logout-button";
import { ThemeControl } from "./theme-control";
import {
  DashboardIcon,
  TasksIcon,
  HabitsIcon,
  StudyIcon,
  NotesIcon,
  ChatIcon,
  PeopleIcon,
  ShieldIcon,
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
  ChevronDownIcon,
  GridIcon,
  XIcon,
} from "./icons";
import { SIDEBAR_EVENT, readCollapsed, type ShellCounts, type ShellUser } from "./shell";
import { useBodyLock } from "./toast";
import { SidebarLogo } from "./sidebar-logo";

const STORAGE_KEY = "sidebar-collapsed";

type NavLink = {
  href: string;
  label: string;
  Icon: typeof DashboardIcon;
};

const SECTIONS: Array<{ label: string; links: NavLink[] }> = [
  {
    label: "Plan",
    links: [
      { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
      { href: "/tasks", label: "Tasks", Icon: TasksIcon },
      { href: "/exams", label: "Deadlines", Icon: CalendarIcon },
      { href: "/timetable", label: "Timetable", Icon: ClassroomIcon },
    ],
  },
  {
    label: "Study",
    links: [
      { href: "/study", label: "Study", Icon: StudyIcon },
      { href: "/notes", label: "Notes", Icon: NotesIcon },
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
      { href: "/chat", label: "Chat", Icon: ChatIcon },
      { href: "/people", label: "People", Icon: PeopleIcon },
      { href: "/search", label: "Search", Icon: SearchIcon },
    ],
  },
];

const BOTTOM_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Home", Icon: DashboardIcon },
  { href: "/tasks", label: "Tasks", Icon: TasksIcon },
  { href: "/study", label: "Study", Icon: StudyIcon },
  { href: "/chat", label: "Chat", Icon: ChatIcon },
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const isAdmin = user.role === "admin";

  useBodyLock(menuOpen);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setCollapsed(readCollapsed());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep the current section open so collapsing never hides the page you are on.
  useEffect(() => {
    const active = SECTIONS.find((section) =>
      section.links.some((link) => pathname.startsWith(link.href))
    );
    if (!active) return;
    setClosedSections((current) =>
      current.includes(active.label)
        ? current.filter((label) => label !== active.label)
        : current
    );
  }, [pathname]);

  // Close the sheet with Escape, or when the viewport grows to desktop.
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
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: next }));
      return next;
    });
  }

  function toggleSection(label: string) {
    setClosedSections((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  const isCollapsed = mounted ? collapsed : false;
  const width = isCollapsed ? "md:w-[76px]" : "md:w-60";

  function renderSidebarLink(link: NavLink) {
    const { href, label, Icon } = link;
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        title={isCollapsed ? label : undefined}
        aria-label={isCollapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-10 items-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isCollapsed ? "justify-center px-0" : "gap-3 px-3 py-2"
        } ${
          active
            ? "bg-brand-soft text-brand"
            : "text-muted hover:bg-surface2 hover:text-ink"
        }`}
      >
        <Icon width={19} height={19} className="shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  function sheetLink(link: NavLink) {
    const { href, label, Icon } = link;
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`tap flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 text-center text-[11px] font-medium leading-tight ${
          active
            ? "border-brand/40 bg-brand-soft text-brand"
            : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
        }`}
      >
        <Icon width={20} height={20} className="shrink-0" />
        <span className="max-w-full">{label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
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
                <span className="truncate text-lg font-bold tracking-tight">Group Portal</span>
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

        <nav className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
          {SECTIONS.map((section, index) => {
            const closed = closedSections.includes(section.label);
            return (
              <div key={section.label}>
                {isCollapsed ? (
                  index > 0 ? <div className="mx-2 mb-1 border-t border-border" /> : null
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    aria-expanded={!closed}
                    className="mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  >
                    {section.label}
                    <ChevronDownIcon
                      width={13}
                      height={13}
                      className={`transition-transform ${closed ? "-rotate-90" : ""}`}
                    />
                  </button>
                )}
                {!closed ? (
                  <div className="flex flex-col gap-0.5">
                    {section.links.map((link) => renderSidebarLink(link))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {isAdmin ? (
          <div className="shrink-0 border-t border-border p-3">
            <Link
              href="/admin"
              title={isCollapsed ? "Admin" : undefined}
              aria-label={isCollapsed ? "Admin" : undefined}
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5 py-2"
              } ${
                pathname.startsWith("/admin")
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <ShieldIcon width={18} height={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">Admin</span>}
            </Link>
          </div>
        ) : null}
      </aside>

      {/* Mobile bottom navigation: main destinations plus the More sheet. */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pt-1 backdrop-blur md:hidden">
        {BOTTOM_LINKS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          const count =
            href === "/chat"
              ? counts.chatUnread
              : href === "/tasks"
                ? counts.tasksDueToday
                : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={
                count > 0
                  ? `${label}, ${count} ${href === "/chat" ? "unread" : "due"}`
                  : label
              }
              className={`tap flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <span className="relative">
                <Icon width={20} height={20} />
                <Badge count={count} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open all pages"
          aria-expanded={menuOpen}
          className={`tap flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${
            menuOpen ? "text-brand" : "text-muted"
          }`}
        >
          <span className="relative">
            <GridIcon width={20} height={20} />
          </span>
          <span>More</span>
        </button>
      </nav>

      {/* More: a bottom sheet with an icon grid, not another long drawer. */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All pages"
            className="safe-bottom absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-2xl border-b border-border bg-surface px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <SidebarLogo size={32} />
                <span className="truncate font-bold">All pages</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <XIcon width={18} height={18} />
              </button>
            </div>

            <div className="p-3">
              {SECTIONS.map((section) => (
                <section key={section.label} className="mb-3">
                  <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {section.links.map((link) => sheetLink(link))}
                  </div>
                </section>
              ))}

              <section className="mb-2 border-t border-border pt-3">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Settings
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="tap flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-1 py-2 text-center text-[11px] font-medium leading-tight text-muted hover:bg-surface2 hover:text-ink"
                  >
                    <SettingsIcon width={20} height={20} />
                    Settings
                  </Link>
                  <Link
                    href="/guide"
                    onClick={() => setMenuOpen(false)}
                    className="tap flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-1 py-2 text-center text-[11px] font-medium leading-tight text-muted hover:bg-surface2 hover:text-ink"
                  >
                    <InfoIcon width={20} height={20} />
                    Guide
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="tap flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-1 py-2 text-center text-[11px] font-medium leading-tight text-muted hover:bg-surface2 hover:text-ink"
                    >
                      <ShieldIcon width={20} height={20} />
                      Admin
                    </Link>
                  ) : null}
                  <LogoutButton variant="grid" />
                </div>
              </section>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface2/60 px-3 py-2">
                <span className="text-sm font-medium">Theme</span>
                <ThemeControl />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
