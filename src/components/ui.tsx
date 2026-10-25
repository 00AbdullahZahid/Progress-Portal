import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-border bg-surface shadow-sm ${
        padded ? "p-4 sm:p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6 sm:items-end">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted break-words">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "submit",
  disabled,
  name,
  value,
  formAction,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger";
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => Promise<void> | void;
  onClick?: () => void;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-brand text-white hover:opacity-90 disabled:opacity-50 shadow-sm",
    ghost: "bg-transparent hover:bg-surface2 text-ink",
    outline:
      "border border-border bg-surface hover:bg-surface2 text-ink",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      name={name}
      value={value}
      formAction={formAction}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-10 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-10 sm:text-sm ${className}`}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-brand sm:text-sm ${className}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-10 sm:text-sm ${className}`}
    />
  );
}

const badgeColors: Record<string, string> = {
  todo: "bg-surface2 text-muted",
  doing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  low: "bg-surface2 text-muted",
  med: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  high: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function Badge({
  kind,
  children,
}: {
  kind: keyof typeof badgeColors | string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[kind] ?? badgeColors.todo}`}
    >
      {children ?? kind}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center sm:p-10">
      {icon ? (
        <div className="text-muted [&>svg]:h-10 [&>svg]:w-10">{icon}</div>
      ) : null}
      <p className="mt-3 font-medium">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
