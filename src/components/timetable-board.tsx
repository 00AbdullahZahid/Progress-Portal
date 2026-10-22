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
  ownerId: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function TimetableBoard({ entries, meId }: { entries: EntryRow[]; meId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const mine = entries.filter((e) => e.ownerId === meId);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarIcon width={18} height={18} className="text-brand" />
            Weekly classes
          </h2>
          <Button type="button" variant="outline" className="px-3 py-1.5 text-sm" onClick={() => setCreating((c) => !c)}>
            <PlusIcon width={15} height={15} />
            Add
          </Button>
        </div>

        {creating ? (
          <form action={submit} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
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
              <Button type="button" variant="outline" className="px-3 py-1.5 text-sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {DAYS.map((day, i) => {
          const list = mine.filter((e) => e.weekday === i).sort((a, b) => a.startMin - b.startMin);
          return (
            <Card key={day} className="flex flex-col gap-2 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{day}</h3>
              {list.length === 0 ? (
                <p className="text-xs text-muted">—</p>
              ) : (
                list.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-start justify-between gap-1 rounded-lg px-2 py-1.5 text-xs"
                    style={{ backgroundColor: e.color + "22", borderLeft: `3px solid ${e.color}` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{e.title}</p>
                      <p className="text-muted">
                        {fmt(e.startMin)}–{fmt(e.endMin)}
                      </p>
                      {e.location ? <p className="truncate text-muted">{e.location}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      title="Remove"
                      aria-label="Remove"
                      className="shrink-0 text-muted opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                    >
                      <XIcon width={13} height={13} />
                    </button>
                  </div>
                ))
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
