import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Only redirect if the session points to a user that still exists.
  // (Prevents an infinite loop when a stale cookie references a deleted user.)
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const members = await db.user.findMany({
    orderBy: [{ role: "desc" }, { name: "asc" }],
    select: { handle: true, name: true, role: true, color: true },
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-bg to-rose-50 p-4 dark:from-indigo-950/40 dark:via-bg dark:to-rose-950/30">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={28}
              height={28}
            >
              <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Group Portal</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in with your username and password.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm members={members} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Invite-only. Forgot your password? Ask the super admin.
        </p>
      </div>
    </div>
  );
}
