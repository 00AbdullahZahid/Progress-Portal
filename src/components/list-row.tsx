import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A compact, consistent row used in lists across Home and Library. The whole
 * row becomes a link when `href` is supplied; otherwise it renders as a div.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  className = "",
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );

  const base = `flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 sm:gap-3 ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} transition-colors hover:bg-surface2 focus-visible:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none`}
      >
        {body}
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
