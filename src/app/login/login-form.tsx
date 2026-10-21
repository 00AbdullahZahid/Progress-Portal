"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { Button, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
          placeholder="Your username"
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
          maxLength={200}
          required
        />
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !handle.trim() || !password}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
