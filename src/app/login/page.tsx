import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginForm } from "./login-form";
import { AdminContact } from "./admin-contact";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signedout?: string; expired?: string }>;
}) {
  // Only redirect if the session points to a user that still exists.
  // (Prevents an infinite loop when a stale cookie references a deleted user.)
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { signedout, expired } = await searchParams;
  const notice = expired ? "expired" : signedout ? "signedout" : undefined;

  // No email or phone is stored for members, so a reset request needs either a
  // configured contact or the super admin's handle to be actionable.
  const admin = await db.user.findFirst({
    where: { role: "admin", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { name: true, handle: true },
  });
  const contact = process.env.ADMIN_CONTACT?.trim() || null;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div className="absolute right-3 top-3 z-10">
        <ThemeToggle className="border border-border bg-surface shadow-sm" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, var(--color-brand-soft) 0%, transparent 58%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-lg">
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
              aria-hidden="true"
            >
              <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Group Portal</h1>
          <p className="mt-1 text-sm text-muted">Study together, stay on track.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_30px_rgba(28,25,23,0.06)] sm:p-7 dark:shadow-none">
          <LoginForm notice={notice} />
        </div>

        <AdminContact
          contact={contact}
          adminName={admin?.name ?? null}
          adminHandle={admin?.handle ?? null}
        />
      </div>
    </div>
  );
}
