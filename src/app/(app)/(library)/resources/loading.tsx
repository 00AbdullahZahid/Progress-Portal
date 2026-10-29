export default function ResourcesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse" aria-label="Loading resources">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="h-7 w-36 rounded-lg bg-surface2" />
          <div className="mt-2 h-4 w-64 max-w-full rounded bg-surface2" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-surface2" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-14 rounded-xl border border-border bg-surface p-2.5">
            <div className="h-3 w-2/3 rounded bg-surface2" />
            <div className="mt-2 h-2.5 w-1/2 rounded bg-surface2" />
          </div>
        ))}
      </div>

      <div className="mb-4 space-y-2 border-b border-border/60 py-2.5">
        <div className="h-10 w-full rounded-xl bg-surface2" />
        <div className="flex gap-1.5 overflow-hidden">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="h-9 w-24 shrink-0 rounded-full bg-surface2" />
          ))}
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-9 w-28 shrink-0 rounded-full bg-surface2" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1].map((group) => (
          <div key={group} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex h-12 items-center gap-2 border-b border-border px-4">
              <div className="h-4 w-4 rounded bg-surface2" />
              <div className="h-3.5 w-32 rounded bg-surface2" />
              <div className="ml-auto h-5 w-8 rounded-full bg-surface2" />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3 border-b border-border px-4 py-3 last:border-0">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-surface2" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/5 rounded bg-surface2" />
                  <div className="mt-2 h-3 w-2/5 rounded bg-surface2" />
                </div>
                <div className="hidden h-8 w-20 rounded-lg bg-surface2 sm:block" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
