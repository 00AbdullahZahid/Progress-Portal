"use client";

import { signOut } from "@/lib/actions/auth";
import { LogoutIcon } from "./icons";

/**
 * Sign out, clearing any cached assets first. Cached private pages would
 * otherwise survive logout and be readable offline on a shared computer.
 */
export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <form
      action={async () => {
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
      <button
        type="submit"
        aria-label="Sign out"
        className={
          collapsed
            ? "rounded-xl p-2 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
            : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
        }
      >
        <LogoutIcon width={collapsed ? undefined : 20} height={collapsed ? undefined : 20} />
        {collapsed ? null : "Sign out"}
      </button>
    </form>
  );
}
