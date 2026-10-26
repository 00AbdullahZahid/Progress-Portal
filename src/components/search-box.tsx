"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./icons";

/** A compact search box that jumps to the global search page. */
export function SearchBox({
  className = "",
  autoFocus = false,
  onSubmitted,
  onCancel,
}: {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    onSubmitted?.();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className={`relative ${className}`}>
      <SearchIcon
        width={15}
        height={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel?.();
          }
        }}
        placeholder="Search…"
        aria-label="Search"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="min-h-11 w-full rounded-xl border border-border bg-surface2 py-1.5 pl-8 pr-2 text-base text-ink placeholder:text-muted outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 sm:min-h-9 sm:text-sm"
      />
    </form>
  );
}
