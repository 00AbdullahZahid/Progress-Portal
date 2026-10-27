"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BellIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  FolderIcon,
  TasksIcon,
} from "./icons";
import { showDeviceNotification, hasBrowserPushSubscription } from "@/lib/device-notifications";

type NotificationItem = {
  id: string;
  kind:
    | "task_assigned"
    | "task_comment"
    | "task_mention"
    | "task_status"
    | "task_due"
    | "project_new"
    | "chat_mention"
    | "exam_due";
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const CHANGE_EVENT = "portal-notifications-changed";

const KIND_META: Record<
  NotificationItem["kind"],
  { icon: typeof BellIcon; className: string }
> = {
  task_assigned: { icon: TasksIcon, className: "bg-brand-soft text-brand" },
  task_comment: { icon: ChatIcon, className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  task_mention: { icon: ChatIcon, className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  task_status: { icon: CheckIcon, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  task_due: { icon: ClockIcon, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  project_new: { icon: FolderIcon, className: "bg-surface2 text-muted" },
  chat_mention: { icon: ChatIcon, className: "bg-brand-soft text-brand" },
  exam_due: { icon: CalendarIcon, className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell({
  className = "",
  align = "left",
}: {
  className?: string;
  align?: "left" | "right";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Null until the first successful poll so old unread items do not all pop a
  // device notification the moment the app opens.
  const seenIds = useRef<Set<string> | null>(null);
  // A browser with Web Push already gets these from the service worker; adding
  // a local notification would show each event twice.
  const pushActive = useRef<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unread?: number;
        items?: NotificationItem[];
      };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setUnread(typeof data.unread === "number" ? data.unread : 0);
      setLoaded(true);

      const previous = seenIds.current;
      seenIds.current = new Set(nextItems.map((item) => item.id));
      if (!previous) return;

      if (pushActive.current === null) {
        pushActive.current = await hasBrowserPushSubscription();
      }
      if (pushActive.current) return;

      // Notify on the phone/desktop for genuinely new unread items. Cap it so
      // a burst (e.g. several mentions) does not spam the notification shade.
      const fresh = nextItems
        .filter((item) => !item.read && !previous.has(item.id))
        .slice(0, 3);
      for (const item of fresh) {
        void showDeviceNotification({
          title: item.title,
          body: item.body,
          href: item.href,
          tag: `portal-${item.kind}-${item.id}`,
        });
      }
    } catch {
      // A notification refresh must never interrupt the page.
    }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("focus", onChange);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Home-screen/app badge (Android and installed PWAs) and a tab-title count.
  useEffect(() => {
    const badge = unread > 0 ? Math.min(unread, 99) : 0;
    const nav = navigator as Navigator & {
      setAppBadge?: (value?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (badge > 0) void nav.setAppBadge?.(badge);
      else void nav.clearAppBadge?.();
    } catch {
      // Badging is optional; ignore unsupported browsers.
    }

    const applyTitle = () => {
      const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
      document.title = badge > 0 ? `(${badge > 99 ? "99+" : badge}) ${base}` : base;
    };
    applyTitle();
    // Next.js may update the title just after a route change.
    const frame = requestAnimationFrame(applyTitle);
    return () => cancelAnimationFrame(frame);
  }, [unread, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function markRead(id?: string) {
    const previousItems = items;
    const previousUnread = unread;
    setItems((current) =>
      current.map((item) => (id ? (item.id === id ? { ...item, read: true } : item) : { ...item, read: true }))
    );
    setUnread(id ? Math.max(0, unread - 1) : 0);

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
        keepalive: true,
      });
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setItems(previousItems);
      setUnread(previousUnread);
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <BellIcon width={20} height={20} />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-surface"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/20 md:bg-transparent"
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className={`fixed inset-x-3 top-[4.25rem] z-50 flex max-h-[min(34rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl md:absolute md:inset-x-auto md:top-full md:mt-2 md:w-[22rem] ${
              align === "right" ? "md:right-0" : "md:left-0"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Notifications</h2>
                <p className="text-[11px] text-muted">
                  {unread > 0 ? `${unread} unread` : "You're all caught up"}
                </p>
              </div>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markRead()}
                  className="flex min-h-11 items-center rounded-lg px-2 text-xs font-medium text-brand hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!loaded ? (
                <div className="flex flex-col gap-2 p-3" aria-label="Loading notifications">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex animate-pulse gap-2 rounded-xl bg-surface2/60 p-3">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-border" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-border" />
                        <div className="h-2.5 w-full rounded bg-border/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BellIcon width={24} height={24} className="mx-auto text-muted" />
                  <p className="mt-2 text-sm font-medium">Nothing yet</p>
                  <p className="mt-1 text-xs text-muted">
                    Task assignments, comments, and reminders will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const meta = KIND_META[item.kind] ?? KIND_META.project_new;
                    const Icon = meta.icon;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href ?? "/tasks"}
                          onClick={() => {
                            if (!item.read) void markRead(item.id);
                            setOpen(false);
                          }}
                          className={`flex gap-3 px-3 py-3 transition-colors hover:bg-surface2/70 focus-visible:bg-surface2 focus-visible:outline-none ${
                            item.read ? "opacity-75" : ""
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
                            <Icon width={16} height={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span className={`min-w-0 flex-1 text-xs font-semibold ${item.read ? "" : "text-ink"}`}>
                                {item.title}
                              </span>
                              {!item.read ? (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                              ) : null}
                            </span>
                            {item.body ? (
                              <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted">{item.body}</span>
                            ) : null}
                            <span className="mt-1 block text-[10px] text-muted">{timeAgo(item.createdAt)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Link
              href="/settings#notifications"
              onClick={() => setOpen(false)}
              className="flex min-h-11 shrink-0 items-center justify-center border-t border-border px-4 text-center text-xs font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              Notification settings
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
