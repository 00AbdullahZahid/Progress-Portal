"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword } from "@/lib/actions/auth";
import { Card, Button, Input } from "./ui";
import { KeyIcon } from "./icons";

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ type: "err", text: "New passwords don't match." });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("current", current);
      fd.set("next", next);
      const res = (await changeOwnPassword(fd)) as
        | { ok?: boolean; error?: string }
        | undefined;
      if (res?.error) {
        setMsg({ type: "err", text: res.error });
      } else {
        setMsg({ type: "ok", text: "Password updated." });
        setCurrent("");
        setNext("");
        setConfirm("");
        // The password change bumps tokenVersion, which revokes the calendar
        // link shown on this page. Refresh so the new link is generated.
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <KeyIcon width={18} height={18} className="text-brand" />
        Change your password
      </h2>
      <p className="mb-3 text-sm text-muted">Use at least 8 characters.</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="cp-current" className="mb-1 block text-xs font-medium text-muted">
            Current password
          </label>
          <Input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <label htmlFor="cp-next" className="mb-1 block text-xs font-medium text-muted">
            New password
          </label>
          <Input
            id="cp-next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            maxLength={200}
            required
          />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="mb-1 block text-xs font-medium text-muted">
            Confirm new password
          </label>
          <Input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            maxLength={200}
            required
          />
        </div>
        {msg ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl px-3 py-2 text-sm ${
              msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            {msg.text}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending || next.length < 8}
          className="self-start"
        >
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
