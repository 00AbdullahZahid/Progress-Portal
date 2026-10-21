"use client";

import { useState, useTransition } from "react";
import { adminResetPassword } from "@/lib/actions/auth";
import { Card, Button, Input, Select } from "./ui";
import { ShieldIcon } from "./icons";

type Member = { handle: string; name: string; role: string; color: string };

export function AdminResetPanel({ members }: { members: Member[] }) {
  const [handle, setHandle] = useState(members[0]?.handle ?? "");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("handle", handle);
      fd.set("next", next);
      const res = (await adminResetPassword(fd)) as
        | { ok?: boolean; name?: string; error?: string }
        | undefined;
      if (res?.error) {
        setMsg({ type: "err", text: res.error });
      } else {
        setMsg({ type: "ok", text: `Password reset for ${res?.name ?? "user"}.` });
        setNext("");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <ShieldIcon width={18} height={18} className="text-amber-500" />
        Reset a member&apos;s password
      </h2>
      <p className="mb-3 text-sm text-muted">
        As super admin you can set a new password for anyone. Share it with them privately.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="reset-member" className="mb-1 block text-xs font-medium text-muted">
            Member
          </label>
          <Select id="reset-member" value={handle} onChange={(e) => setHandle(e.target.value)}>
            {members.map((m) => (
              <option key={m.handle} value={m.handle}>
                {m.name} (@{m.handle}){m.role === "admin" ? " — admin" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="reset-password" className="mb-1 block text-xs font-medium text-muted">
            New password
          </label>
          <Input
            id="reset-password"
            type="text"
            autoComplete="off"
            placeholder="At least 8 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
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
        <Button type="submit" disabled={pending || next.length < 8} className="self-start">
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </Card>
  );
}
