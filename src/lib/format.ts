/**
 * Small display helpers for durations. Keeping these in one place means the
 * dashboard, study page, and charts all round and label minutes the same way.
 */

/** "0m", "45m", "1h", "1h 20m" — useful when precision matters. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "0h", "2.5h", "12h" — compact labels at the end of chart bars. */
export function formatHours(minutes: number): string {
  const hours = Math.max(0, Math.round(minutes / 6) / 10);
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** "09:05" — a timetable-style clock label. */
export function formatClock(totalMinutes: number): string {
  const value = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** First name only, for greetings and tight chart labels. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
