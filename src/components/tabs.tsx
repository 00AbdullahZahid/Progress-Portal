"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = {
  href: string;
  label: string;
  /** Optional count shown as a small pill, e.g. open tasks. */
  count?: number;
};

/**
 * Horizontal section tabs. Each tab is a link so the URL stays shareable and
 * the browser back button keeps working. Active state is derived from the
 * current pathname; pass `exact` when a tab should only match its own URL.
 */
export function Tabs({
  items,
  label,
  className = "",
  exactHrefs = [],
}: {
  items: TabItem[];
  label: string;
  className?: string;
  exactHrefs?: string[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className={`no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-surface2/70 p-1 ${className}`}
    >
      {items.map((item) => {
        const exact = exactHrefs.includes(item.href);
        const active = exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && item.count > 0 ? (
              <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                {item.count > 99 ? "99+" : item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
