import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./ui";

/**
 * A dashboard number with just enough context to act on. The whole tile is a
 * link when `href` is set, so "Open tasks" really opens tasks.
 */
export function StatCard({
  label,
  value,
  icon,
  href,
  hint,
  hintTone = "muted",
  progressPercent,
  progressLabel,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  href?: string;
  hint?: ReactNode;
  hintTone?: "muted" | "good" | "warn";
  progressPercent?: number;
  progressLabel?: string;
}) {
  const tone =
    hintTone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : hintTone === "warn"
        ? "text-amber-700 dark:text-amber-400"
        : "text-muted";

  const body = (
    <div className="flex min-h-[5.5rem] items-start gap-3 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">{value}</p>
        {hint ? <p className={`mt-1 text-[11px] leading-snug ${tone}`}>{hint}</p> : null}
        {typeof progressPercent === "number" ? (
          <div className="mt-2" title={progressLabel}>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>
            {progressLabel ? (
              <p className="mt-1 truncate text-[10px] text-muted">{progressLabel}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card
      padded={false}
      className={`tap h-full overflow-hidden ${
        href ? "transition-colors hover:border-brand/40 hover:bg-surface2/40" : ""
      }`}
    >
      {href ? (
        <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}
