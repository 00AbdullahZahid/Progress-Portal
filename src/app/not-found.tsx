import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-5xl font-bold text-brand">404</p>
        <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
