"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { Button, Input } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

export function LoginForm({ notice }: { notice?: "signedout" | "expired" }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const noticeText =
    notice === "expired"
      ? "Your session expired. Sign in again to continue."
      : notice === "signedout"
        ? "You're signed out. See you soon."
        : "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
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

  function updateCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {noticeText ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          {noticeText}
        </p>
      ) : null}

      <div>
        <label htmlFor="handle" className="mb-1.5 block text-sm font-medium">
          Username
        </label>
        <Input
          id="handle"
          name="handle"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          enterKeyHint="next"
          placeholder="Your username"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="bg-bg"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={updateCapsLock}
            onKeyUp={updateCapsLock}
            onBlur={() => setCapsLock(false)}
            maxLength={200}
            enterKeyHint="go"
            className="bg-bg pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOffIcon width={18} height={18} />
            ) : (
              <EyeIcon width={18} height={18} />
            )}
          </button>
        </div>
        {capsLock ? (
          <p
            role="status"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
          >
            <span aria-hidden="true">⇪</span>
            Caps Lock is on.
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          id="login-error"
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !handle.trim() || !password}
        className="mt-0.5 w-full"
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
      <p className="text-center text-xs text-muted">
        You&apos;ll stay signed in on this device for 30 days.
      </p>
    </form>
  );
}
