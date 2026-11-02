"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, Input } from "./ui";
import { AlertIcon } from "./icons";
import { useBodyLock } from "./toast";

/**
 * Accessible confirmation modal used before destructive actions.
 * Renders nothing when closed so it never affects layout.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  confirmText,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this exact text before confirming. */
  confirmText?: string;
  onConfirm: (typed: string) => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  useBodyLock(open);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open, confirmText]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              destructive
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                : "bg-brand-soft text-brand"
            }`}
          >
            <AlertIcon width={18} height={18} />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">{title}</h2>
            {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
            {confirmText ? (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Type <span className="font-semibold text-ink">{confirmText}</span> to
                  confirm
                </span>
                <Input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  aria-label={`Type ${confirmText} to confirm`}
                  autoComplete="off"
                  autoFocus
                />
              </label>
            ) : null}
            {children}
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            className="w-full sm:w-auto"
            disabled={
              confirmText
                ? typed.trim().toLowerCase() !== confirmText.trim().toLowerCase()
                : false
            }
            onClick={() => onConfirm(typed)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
