"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChartIcon, RefreshIcon, SearchIcon, XIcon } from "./icons";
import { NotificationBell } from "./notification-bell";
import { ProfileMenu } from "./profile-menu";
import { SearchBox } from "./search-box";
import type { ShellUser } from "./shell";

/**
 * One top bar for every screen. The bell, search, refresh, and profile used to
 * be split between the sidebar and mobile header; keeping them here gives the
 * sidebar back its vertical space.
 */
export function TopBar({ user }: { user: ShellUser }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRefreshing(false), 900);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1.5 px-3 sm:px-6 md:px-8">
        {!searchOpen ? (
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="tap flex min-w-0 items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none md:hidden"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <BarChartIcon width={18} height={18} />
            </span>
            <span className="hidden truncate text-base font-bold tracking-tight min-[380px]:inline">
              Group Portal
            </span>
          </Link>
        ) : null}

        {searchOpen ? (
          <>
            <SearchBox
              autoFocus
              className="min-w-0 flex-1"
              onSubmitted={() => setSearchOpen(false)}
              onCancel={() => setSearchOpen(false)}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <XIcon width={18} height={18} />
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              title="Search"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <SearchIcon width={20} height={20} />
            </button>
          </>
        )}

        {!searchOpen ? (
          <>
            <button
              type="button"
              onClick={refresh}
              aria-label={refreshing ? "Refreshing" : "Refresh data"}
              title="Refresh data"
              aria-busy={refreshing}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <RefreshIcon
                width={19}
                height={19}
                className={refreshing ? "animate-spin" : undefined}
              />
            </button>
            <NotificationBell align="right" />
            <ProfileMenu user={user} />
          </>
        ) : null}
      </div>
    </header>
  );
}
