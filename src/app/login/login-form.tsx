"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { Button, Input } from "@/components/ui";
import { Avatar } from "@/components/avatar";

type Member = { handle: string; name: string; role: string; color: string };

export function LoginForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = members.find((m) => m.handle === handle);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("handle", handle);
      fd.set("password", password);
      const res = (await signIn(fd)) as { error?: string } | undefined;
      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="handle" className="mb-1.5 block text-sm font-medium">
          Username
        </label>
        <Input
          id="handle"
          name="handle"
          autoComplete="username"
          placeholder="e.g. alex"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {selected ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
          <Avatar user={{ name: selected.name, color: selected.color }} size="sm" />
          <span className="text-sm">
            Signing in as <span className="font-medium">{selected.name}</span>
            {selected.role === "admin" ? (
              <span className="ml-1 text-xs text-muted">(super admin)</span>
            ) : null}
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !handle.trim() || !password}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
