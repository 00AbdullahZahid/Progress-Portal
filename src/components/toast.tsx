"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon, AlertIcon, XIcon } from "./icons";

type ToastKind = "success" | "error" | "info";
type ToastAction = { label: string; href: string };
type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success", action?: ToastAction) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message, action }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg ${
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : t.kind === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                  : "border-border bg-surface text-ink"
            }`}
          >
            <span className="shrink-0">
              {t.kind === "success" ? (
                <CheckIcon width={16} height={16} />
              ) : t.kind === "error" ? (
                <AlertIcon width={16} height={16} />
              ) : null}
            </span>
            <span className="flex-1">{t.message}</span>
            {t.action ? (
              <Link
                href={t.action.href}
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="shrink-0 rounded-md px-1 py-0.5 text-xs font-semibold underline underline-offset-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t.action.label}
              </Link>
            ) : null}
            <button
              aria-label="Dismiss"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="shrink-0 rounded-md p-0.5 text-current/70 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <XIcon width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Allow components to be used outside the provider without crashing.
    return { toast: () => {} } as ToastContextValue;
  }
  return ctx;
}

/** Lock body scroll while a modal is open. */
export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
