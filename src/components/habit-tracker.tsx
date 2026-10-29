"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createHabit,
  renameHabit,
  toggleCheckIn,
  deleteHabit,
} from "@/lib/actions/habits";
import type { ActionResult } from "@/lib/actions/tasks";
import { Card, Button, Input, EmptyState } from "./ui";
import { Avatar } from "./avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog } from "./dialog";
import { useToast } from "./toast";
import { currentStreak } from "@/lib/dates";
import { HabitsIcon, FlameIcon, PlusIcon, XIcon, CheckIcon, EditIcon } from "./icons";

type Habit = { id: string; name: string; checkinDates: string[]; allDates: string[] };
type GroupMember = { id: string; name: string; color: string; image?: string | null };

export function HabitTracker({
  habits,
  days,
  today,
  groupToday,
  meId,
}: {
  habits: Habit[];
  days: string[];
  today: string;
  groupToday: { habitName: string; owner: GroupMember }[];
  meId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null
  );
  const [editing, setEditing] = useState<Habit | null>(null);
  const [busy, setBusy] = useState(false);

  function act(
    fn: (fd: FormData) => Promise<ActionResult>,
    success: string
  ) {
    return async (fd: FormData) => {
      try {
        const res = await fn(fd);
        if (!res.ok) {
          toast(res.error, "error");
          return;
        }
        if (success) toast(success, "success");
        router.refresh();
      } catch {
        toast("Something went wrong. Please try again.", "error");
      }
    };
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    const fd = new FormData();
    fd.set("habitId", id);
    try {
      const res = await deleteHabit(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Habit removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  async function submitRename(fd: FormData) {
    if (!editing) return;
    fd.set("habitId", editing.id);
    setBusy(true);
    try {
      const res = await renameHabit(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Habit updated", "success");
      setEditing(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  const grouped = groupToday.reduce<Record<string, typeof groupToday>>((acc, g) => {
    (acc[g.owner.id] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="mb-4 p-4">
          <form
            action={act(createHabit, "Habit created")}
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <PlusIcon width={16} height={16} className="text-brand" />
              New habit
            </span>
            <Input
              name="name"
              placeholder="e.g. Deep work 1h"
              className="min-w-0 flex-1 sm:min-w-40"
              required
            />
            <Button type="submit" className="w-full sm:w-auto">
              Add
            </Button>
          </form>
        </Card>

        {habits.length === 0 ? (
          <EmptyState
            icon={<HabitsIcon />}
            title="No habits yet"
            hint="Add a habit above — small daily wins compound fast."
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {habits.map((habit) => {
            const set = new Set(habit.checkinDates);
            // Streak uses the full history, not just the visible window.
            const streak = currentStreak(new Set(habit.allDates), today);
            return (
              <Card key={habit.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <HabitsIcon width={18} height={18} className="shrink-0 text-brand" />
                    <span className="break-words font-semibold">{habit.name}</span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      <FlameIcon width={12} height={12} />
                      {streak} day{streak === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(habit)}
                      className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-muted hover:bg-surface2 hover:text-ink"
                    >
                      <EditIcon width={14} height={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ id: habit.id, name: habit.name })}
                      className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-muted hover:bg-surface2 hover:text-rose-600"
                    >
                      <XIcon width={14} height={14} />
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((d) => {
                    const done = set.has(d);
                    const isToday = d === today;
                    return (
                      <form key={d} action={act(toggleCheckIn, "")}>
                        <input type="hidden" name="habitId" value={habit.id} />
                        <input type="hidden" name="date" value={d} />
                        <button
                          type="submit"
                          title={d}
                          className={`h-8 w-8 rounded-md text-xs transition-colors sm:h-7 sm:w-7 ${
                            done
                              ? "bg-brand text-brand-ink"
                              : "bg-surface2 text-muted hover:bg-border"
                          } ${isToday ? "ring-2 ring-brand ring-offset-1 ring-offset-surface" : ""}`}
                        >
                          {done ? <CheckIcon width={14} height={14} className="mx-auto" /> : Number(d.slice(-2))}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="h-fit">
        <h2 className="mb-1 font-semibold">Today&apos;s check-ins</h2>
        <p className="mb-3 text-xs text-muted">Who&apos;s on track right now</p>
        {groupToday.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
            No check-ins yet today. Be the first!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(grouped).map(([uid, items]) => {
              const owner = items[0].owner;
              return (
                <div key={uid} className="flex items-start gap-2">
                  <Avatar user={owner} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {owner.name}
                      {uid === meId ? <span className="text-xs text-muted"> (you)</span> : null}
                    </p>
                    <p className="break-words text-xs text-muted">
                      {items.map((i) => i.habitName).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog
        open={editing !== null}
        title="Edit habit"
        description="Renaming keeps the full check-in history."
        onClose={() => setEditing(null)}
      >
        <form id="habit-edit-form" action={submitRename} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Habit name</span>
            <Input
              name="name"
              maxLength={80}
              defaultValue={editing?.name ?? ""}
              required
              data-autofocus
            />
          </label>
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this habit?"
        body={
          pendingDelete
            ? `"${pendingDelete.name}" and all of its check-ins will be permanently removed.`
            : undefined
        }
        confirmLabel="Remove habit"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
