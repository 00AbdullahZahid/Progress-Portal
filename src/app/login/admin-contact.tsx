"use client";

import { useState } from "react";
import { CopyIcon } from "@/components/icons";

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  if (/^\+?[\d\s()-]{7,}$/.test(trimmed)) {
    return `https://wa.me/${trimmed.replace(/[^\d]/g, "")}`;
  }
  return null;
}

/**
 * A password reset should never end at "ask the super admin" with no way to do
 * it. Prefer a configured contact link, otherwise expose the admin handle with
 * a one-tap copy button.
 */
export function AdminContact({
  contact,
  adminName,
  adminHandle,
}: {
  contact: string | null;
  adminName: string | null;
  adminHandle: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const href = contact ? contactHref(contact) : null;

  async function copy() {
    if (!adminHandle) return;
    try {
      await navigator.clipboard.writeText(`@${adminHandle}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the handle is still on screen.
    }
  }

  if (href) {
    return (
      <p className="mt-4 text-center text-sm text-muted">
        Invite-only. Need a password reset?{" "}
        <a
          href={href}
          className="font-semibold text-brand underline underline-offset-2 hover:no-underline"
        >
          Contact {adminName ?? "the super admin"}
        </a>
        .
      </p>
    );
  }

  if (adminHandle) {
    return (
      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm text-muted">
        <span>Invite-only. Need a password reset? Ask</span>
        <span className="font-semibold text-ink">
          {adminName ?? "the super admin"} <span className="font-normal">(@{adminHandle})</span>
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <CopyIcon width={13} height={13} />
          {copied ? "Copied" : "Copy handle"}
        </button>
      </p>
    );
  }

  return (
    <p className="mt-4 text-center text-sm text-muted">
      Invite-only. Need a password reset? Ask a super admin in the group.
    </p>
  );
}
