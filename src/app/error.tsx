"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for debugging; the user sees a friendly card.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
          <AlertIcon width={22} height={22} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted">
          An unexpected error occurred. You can try again, or reload the page if it keeps
          happening.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-brand-ink shadow-sm transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
