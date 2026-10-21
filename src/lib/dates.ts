export function todayStr(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function lastNDays(tz: string, n: number): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(fmt.format(new Date(now.getTime() - i * 86_400_000)));
  }
  return out;
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function currentStreak(dates: Set<string>, today: string): number {
  let streak = 0;
  let cursor = today;
  if (!dates.has(cursor)) cursor = shiftDate(today, -1);
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export function prettyDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The calendar date (YYYY-MM-DD) that a timestamp falls on in a given timezone.
 * Used to bucket task completions by the viewer's local day rather than UTC.
 */
export function dateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
