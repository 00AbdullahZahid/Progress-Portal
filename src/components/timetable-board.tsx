"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimetableEntry, deleteTimetableEntry } from "@/lib/actions/timetable";
import { Button, Card, Input, Select } from "./ui";
import { useToast } from "./toast";
import { PlusIcon, XIcon, CalendarIcon } from "./icons";

export type EntryRow = {
  id: string;
  weekday: number;
  startMin: number;
  endMin: number;
  title: string;
  location: string | null;
  color: string;
  scope: "group" | "personal";
  ownerId: string;
  ownerName: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Height of one hour in the calendar, in pixels. */
const HOUR_PX = 64;

/** The calendar always shows at least 07:00–22:00, stretching for early/late classes. */
const BASE_START_HOUR = 7;
const BASE_END_HOUR = 22;

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type Placed = { entry: EntryRow; col: number; cols: number };

/**
 * Assign side-by-side columns to classes that overlap in time, so two classes
 * at 09:00 are both readable instead of covering each other. Classes are
 * grouped into "clusters" of overlapping times; each cluster shares a column
 * count so widths stay consistent within it.
 */
function placeEntries(entries: EntryRow[]): Placed[] {
  const sorted = [...entries].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );

  const placed: Placed[] = [];
  let cluster: { entry: EntryRow; col: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  function flush() {
    if (cluster.length === 0) return;
    const cols = columnEnds.length;
    for (const item of cluster) placed.push({ entry: item.entry, col: item.col, cols });
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  }

  for (const entry of sorted) {
    // A class that starts at or after the end of the current cluster cannot
    // overlap it, so start a fresh cluster.
    if (cluster.length > 0 && entry.startMin >= clusterEnd) flush();

    const free = columnEnds.findIndex((end) => end <= entry.startMin);
    const col = free === -1 ? columnEnds.length : free;
    columnEnds[col] = entry.endMin;

    cluster.push({ entry, col });
    clusterEnd = Math.max(clusterEnd, entry.endMin);
  }
  flush();

  return placed;
}

export function TimetableBoard({
  entries,
  isAdmin,
  meId,
}: {
  entries: EntryRow[];
  isAdmin: boolean;
  meId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  // Mobile shows a day-by-day agenda instead of squeezing a 7-column grid into
  // a phone. Default to the first day that actually has classes.
  const [day, setDay] = useState(() => (entries.length > 0 ? entries[0].weekday : 1));

  async function submit(fd: FormData) {
    setBusy(true);
    try {
      const res = await createTimetableEntry(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Added to timetable", "success");
      setCreating(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const fd = new FormData();
    fd.set("entryId", id);
    const res = await deleteTimetableEntry(fd);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    router.refresh();
  }

  // Fit the visible range to the earliest/latest class, but never shrink below
  // the base working-day window.
  let startHour = BASE_START_HOUR;
  let endHour = BASE_END_HOUR;
  for (const e of entries) {
    startHour = Math.min(startHour, Math.floor(e.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(e.endMin / 60));
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, Math.max(startHour + 1, endHour));

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h += 1) hours.push(h);
  const bodyHeight = (endHour - startHour) * HOUR_PX;

  const dayEntries = entries
    .filter((e) => e.weekday === day)
    .sort((a, b) => a.startMin - b.startMin);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarIcon width={18} height={18} className="text-brand" />
              Group timetable
            </h2>
            <p className="mt-1 text-xs text-muted">
              {entries.length === 0
                ? isAdmin
                  ? "No classes yet. Add the first one."
                  : "No classes yet. You can add your own personal classes."
                : "Group classes are shared. Personal classes are only visible to you."}
            </p>
          </div>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1.5 text-sm"
              onClick={() => setCreating((c) => !c)}
            >
              <PlusIcon width={15} height={15} />
              {creating ? "Close" : "Add class"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1.5 text-sm"
              onClick={() => setCreating((c) => !c)}
            >
              <PlusIcon width={15} height={15} />
              {creating ? "Close" : "Add personal class"}
            </Button>
          )}
        </div>

        {creating ? (
          <form action={submit} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            {isAdmin ? (
              <label className="block sm:max-w-xs">
                <span className="mb-1 block text-xs font-medium text-muted">Visible to</span>
                <Select name="scope" defaultValue="group">
                  <option value="group">Everyone (group timetable)</option>
                  <option value="personal">Only me (personal)</option>
                </Select>
              </label>
            ) : (
              <input type="hidden" name="scope" value="personal" />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input name="title" maxLength={100} required placeholder="e.g. Physics lecture" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Day</span>
                <Select name="weekday" defaultValue="1">
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Location</span>
                <Input name="location" maxLength={80} placeholder="Room / link" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Start</span>
                <Input type="time" name="start" required defaultValue="09:00" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">End</span>
                <Input type="time" name="end" required defaultValue="10:00" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Color</span>
                <Input type="color" name="color" defaultValue="#2563eb" className="h-10 p-1" />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="px-3 py-1.5 text-sm">
                {busy ? "Saving…" : "Add entry"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="px-3 py-1.5 text-sm"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      {/* Mobile day-by-day agenda */}
      <Card padded={false} className="md:hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
          {DAYS.map((d, i) => {
            const hasClasses = entries.some((e) => e.weekday === i);
            const active = day === i;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(i)}
                aria-pressed={active}
                aria-label={`Show ${d}`}
                className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 text-xs font-semibold transition-colors ${
                  active ? "bg-brand text-brand-ink" : "text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                {d}
                <span
                  className={`mt-1 h-1 w-1 rounded-full ${
                    hasClasses ? (active ? "bg-white" : "bg-brand") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="p-3">
          {dayEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
              No classes on {DAYS[day]}.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl border border-border p-3"
                >
                  <span
                    aria-hidden="true"
                    className="w-1 self-stretch rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{entry.title}</p>
                    <p className="text-xs tabular-nums text-muted">
                      {fmt(entry.startMin)}–{fmt(entry.endMin)}
                      {entry.location ? ` · ${entry.location}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {entry.scope === "personal" ? "Personal class" : `Added by ${entry.ownerName}`}
                    </p>
                  </div>
                  {isAdmin || (entry.scope === "personal" && entry.ownerId === meId) ? (
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      title="Remove class"
                      aria-label={`Remove ${entry.title}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Desktop time grid */}
      <Card padded={false} className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Day headings */}
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
            >
              <div aria-hidden="true" />
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="border-l border-border py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))",
                height: `${bodyHeight}px`,
              }}
            >
              {/* Hour labels */}
              <div className="relative" aria-hidden="true">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted"
                    style={{ top: `${(h - startHour) * HOUR_PX}px` }}
                  >
                    {fmt(h * 60)}
                  </div>
                ))}
              </div>

              {/* One column per day */}
              {DAYS.map((day, dayIndex) => {
                const placed = placeEntries(entries.filter((e) => e.weekday === dayIndex));
                return (
                  <div key={day} className="relative border-l border-border">
                    {hours.map((h) => (
                      <div
                        key={h}
                        aria-hidden="true"
                        className="absolute inset-x-0 border-t border-border"
                        style={{ top: `${(h - startHour) * HOUR_PX}px` }}
                      />
                    ))}

                    {placed.map(({ entry, col, cols }) => {
                      const top = ((entry.startMin - startHour * 60) / 60) * HOUR_PX;
                      const height = ((entry.endMin - entry.startMin) / 60) * HOUR_PX;
                      const wide = cols > 1;
                      const details = height >= 44;
                      return (
                        <div
                          key={entry.id}
                          className="group absolute rounded-lg border-l-[3px] px-1.5 py-1 text-[11px] leading-tight"
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height, 40)}px`,
                            left: wide
                              ? `calc(${(col / cols) * 100}% + 2px)`
                              : "2px",
                            width: wide
                              ? `calc(${100 / cols}% - 4px)`
                              : "calc(100% - 4px)",
                            backgroundColor: `${entry.color}22`,
                            borderLeftColor: entry.color,
                          }}
                          title={`${entry.title} - ${fmt(entry.startMin)}-${fmt(entry.endMin)}${
                            entry.location ? ` - ${entry.location}` : ""
                          } - added by ${entry.ownerName}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="min-w-0 flex-1 break-words font-semibold text-ink">
                              {entry.title}
                            </p>
                            {isAdmin || (entry.scope === "personal" && entry.ownerId === meId) ? (
                              <button
                                type="button"
                                onClick={() => remove(entry.id)}
                                title="Remove class"
                                aria-label={`Remove ${entry.title}`}
                                className="shrink-0 p-1 text-muted transition-opacity hover:text-rose-600 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                              >
                                <XIcon width={12} height={12} />
                              </button>
                            ) : null}
                          </div>
                          {details ? (
                            <p className="break-words text-muted">
                              {fmt(entry.startMin)}-{fmt(entry.endMin)}
                              {entry.location ? ` · ${entry.location}` : ""}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
