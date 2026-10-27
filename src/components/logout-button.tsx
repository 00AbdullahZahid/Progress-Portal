"use client";

import { signOut } from "@/lib/actions/auth";
import { cancelScheduledReminders } from "@/lib/device-notifications";
import { LogoutIcon } from "./icons";
import { Button } from "./ui";

/**
 * Sign out, clearing any cached assets first. Cached private pages would
 * otherwise survive logout and be readable offline on a shared computer.
 * Device reminders are cancelled too, so a shared phone stops showing the
 * previous member's task and exam titles.
 */
export function LogoutButton({
  collapsed = false,
  variant = "row",
}: {
  collapsed?: boolean;
  variant?: "row" | "grid" | "inline";
}) {
  const grid =
    "tap flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-1 py-2 text-center text-[11px] font-medium leading-tight text-muted transition-colors hover:bg-surface2 hover:text-rose-600";

  return (
    <form
      action={async () => {
        // Do not leave this member's task/exam reminders on a shared phone.
        cancelScheduledReminders();
        if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
          navigator.clearAppBadge?.().catch(() => {});
        }
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_CACHES" });
        }
        if (typeof caches !== "undefined") {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {
            // Non-fatal.
          }
        }
        await signOut();
      }}
    >
      {variant === "inline" ? (
        <Button type="submit" variant="outline">
          <LogoutIcon width={16} height={16} />
          Sign out
        </Button>
      ) : (
        <button
          type="submit"
          aria-label="Sign out"
          className={
            variant === "grid"
              ? grid
              : collapsed
                ? "rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
          }
        >
          <LogoutIcon
            width={variant === "grid" ? 20 : collapsed ? undefined : 20}
            height={variant === "grid" ? 20 : collapsed ? undefined : 20}
          />
          {variant === "grid" ? "Sign out" : collapsed ? null : "Sign out"}
        </button>
      )}
    </form>
  );
}
