export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-sm text-muted"
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
        Loading…
      </div>
    </div>
  );
}
