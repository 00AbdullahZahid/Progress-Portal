"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./icons";

/** A compact search box that jumps to the global search page. */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
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
        placeholder="Search…"
        aria-label="Search"
        className="min-h-9 w-full rounded-xl border border-border bg-surface2 py-1.5 pl-8 pr-2 text-base text-ink placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-brand sm:text-sm"
      />
    </form>
  );
}
