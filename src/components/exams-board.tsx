"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExam, updateExam, deleteExam } from "@/lib/actions/exams";
import { Avatar } from "./avatar";
import { Button, Card, Input, Textarea, Select, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog } from "./dialog";
import { useToast } from "./toast";
import { CalendarIcon, PlusIcon, XIcon, EditIcon } from "./icons";

export type ExamRow = {
  id: string;
  title: string;
  subject: string;
  kind: string;
  date: string;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; name: string; color: string; image?: string | null };
};

const KINDS = ["exam", "assignment", "quiz", "deadline"] as const;

/** Whole days from `today` (YYYY-MM-DD) to `date`, both treated as UTC dates. */
function daysUntil(date: string, today: string): number {
  const a = Date.parse(today + "T00:00:00Z");
  const b = Date.parse(date + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

export function ExamsBoard({
  exams,
  meId,
  isAdmin,
  today,
}: {
  exams: ExamRow[];
  meId: string;
  isAdmin: boolean;
  today: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ExamRow | null>(null);
  const [editing, setEditing] = useState<ExamRow | null>(null);

  async function submit(fd: FormData) {
    setBusy(true);
    try {
      const res = await createExam(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Added", "success");
      setCreating(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(fd: FormData) {
    if (!editing) return;
    fd.set("examId", editing.id);
    setBusy(true);
    try {
      const res = await updateExam(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Deadline updated", "success");
      setEditing(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const fd = new FormData();
    fd.set("examId", id);
    try {
      const res = await deleteExam(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  const upcoming = exams.filter((e) => daysUntil(e.date, today) >= 0);
  const past = exams.filter((e) => daysUntil(e.date, today) < 0);

  function row(e: ExamRow) {
    const days = daysUntil(e.date, today);
    const urgent = days >= 0 && days <= 3;
    const canDelete = e.createdById === meId || isAdmin;
    const canEdit = canDelete;
    return (
      <li
        key={e.id}
        className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 sm:gap-3"
      >
        <div
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold ${
            urgent ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-brand-soft text-brand"
          }`}
        >
          <span className="text-[10px] uppercase">{e.kind.slice(0, 3)}</span>
          <span>{days >= 0 ? days : "–"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium">{e.title}</p>
          <p className="truncate text-xs text-muted">
            {e.subject} · {e.date} · {countdownLabel(days)}
          </p>
          {e.notes ? <p className="truncate text-xs text-muted">{e.notes}</p> : null}
        </div>
        <Avatar user={e.createdBy} size="sm" />
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(e)}
            title="Edit"
            aria-label={`Edit ${e.title}`}
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
          >
            <EditIcon width={15} height={15} />
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() => setPending(e)}
            title="Delete"
            aria-label="Delete"
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
          >
            <XIcon width={15} height={15} />
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        {creating ? (
          <form action={submit} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarIcon width={18} height={18} className="text-brand" />
              Add a deadline
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input name="title" maxLength={120} required placeholder="e.g. Midterm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                <Input name="subject" maxLength={60} required placeholder="e.g. Physics" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Type</span>
                <Select name="kind" defaultValue="exam">
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Date</span>
                <Input type="date" name="date" required />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Notes (optional)</span>
              <Textarea name="notes" rows={2} maxLength={500} />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={busy}
                className="w-full px-3 py-1.5 text-sm sm:w-auto"
              >
                <PlusIcon width={15} height={15} />
                {busy ? "Saving…" : "Add"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full px-3 py-1.5 text-sm sm:w-auto"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <PlusIcon width={18} height={18} />
            Add an exam, assignment or deadline
          </button>
        )}
      </Card>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title="Nothing upcoming"
          hint="Add exams and assignments so the whole group can see the countdown."
        />
      ) : (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Upcoming</h2>
          <ul className="flex flex-col gap-2">{upcoming.map(row)}</ul>
        </Card>
      )}

      {past.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-muted">Past</h2>
          <ul className="flex flex-col gap-2 opacity-70">{past.slice(0, 20).map(row)}</ul>
        </Card>
      ) : null}

      {editing ? (
        <Dialog
          open
          title="Edit deadline"
          description="Everyone in the group sees these changes."
          onClose={() => setEditing(null)}
        >
          <form key={editing.id} action={saveEdit} className="flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Title</span>
              <Input
                name="title"
                data-autofocus
                defaultValue={editing.title}
                maxLength={120}
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                <Input
                  name="subject"
                  defaultValue={editing.subject}
                  maxLength={60}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Type</span>
                <Select name="kind" defaultValue={editing.kind}>
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Date</span>
                <Input type="date" name="date" defaultValue={editing.date} required />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Notes (optional)</span>
              <Textarea
                name="notes"
                rows={2}
                maxLength={500}
                defaultValue={editing.notes ?? ""}
              />
            </label>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this deadline?"
        body={pending ? `"${pending.title}" will be removed for everyone.` : undefined}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
