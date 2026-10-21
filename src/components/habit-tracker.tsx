"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createHabit,
  toggleCheckIn,
  deleteHabit,
  type ActionResult,
} from "@/lib/actions/habits";
import { Card, Button, Input, EmptyState } from "./ui";
import { Avatar } from "./avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { currentStreak } from "@/lib/dates";
import { HabitsIcon, FlameIcon, PlusIcon, XIcon, CheckIcon } from "./icons";

type Habit = { id: string; name: string; checkinDates: string[] };
type GroupMember = { id: string; name: string; color: string };

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

  const grouped = groupToday.reduce<Record<string, typeof groupToday>>((acc, g) => {
    (acc[g.owner.id] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="mb-4 p-4">
          <form action={act(createHabit, "Habit created")} className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <PlusIcon width={16} height={16} className="text-brand" />
              New habit
            </span>
            <Input name="name" placeholder="e.g. Deep work 1h" className="min-w-40 flex-1" required />
            <Button type="submit">Add</Button>
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
            const streak = currentStreak(set, today);
            return (
              <Card key={habit.id} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HabitsIcon width={18} height={18} className="text-brand" />
                    <span className="font-semibold">{habit.name}</span>
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      <FlameIcon width={12} height={12} />
                      {streak} day{streak === 1 ? "" : "s"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ id: habit.id, name: habit.name })}
                    className="flex items-center gap-1 text-xs text-muted hover:text-rose-600"
                  >
                    <XIcon width={14} height={14} />
                    Remove
                  </button>
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
                          className={`h-7 w-7 rounded-md text-xs transition-colors ${
                            done
                              ? "bg-brand text-white"
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
        <h2 className="mb-1 font-semibold">Today's check-ins</h2>
        <p className="mb-3 text-xs text-muted">Who's on track right now</p>
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
                  <div>
                    <p className="text-sm font-medium">
                      {owner.name}
                      {uid === meId ? <span className="text-xs text-muted"> (you)</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {items.map((i) => i.habitName).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
