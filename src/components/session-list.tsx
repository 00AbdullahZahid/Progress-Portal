"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudySession, updateStudySession } from "@/lib/actions/study";
import { Avatar } from "./avatar";
import { Button, Input, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { XIcon, EditIcon, CheckIcon } from "./icons";

type Row = {
  id: string;
  subject: string;
  minutes: number;
  notes: string | null;
  date: string;
  userId: string;
  user: { id: string; name: string; color: string };
};

export function SessionList({
  sessions,
  meId,
  prettyDate,
  today,
}: {
  sessions: Row[];
  meId: string;
  prettyDate: (date: string) => string;
  today: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState({ subject: "", minutes: "", notes: "", date: "" });
  const [saving, setSaving] = useState(false);

  async function confirmDelete() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const fd = new FormData();
    fd.set("sessionId", id);
    try {
      const res = await deleteStudySession(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Session removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  function startEdit(s: Row) {
    setEditing(s);
    setDraft({
      subject: s.subject,
      minutes: String(s.minutes),
      notes: s.notes ?? "",
      date: s.date,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || saving) return;
    const fd = new FormData();
    fd.set("sessionId", editing.id);
    fd.set("subject", draft.subject);
    fd.set("minutes", draft.minutes);
    fd.set("notes", draft.notes);
    fd.set("date", draft.date);
    setSaving(true);
    try {
      const res = await updateStudySession(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Session updated", "success");
      setEditing(null);
      router.refresh();
    } catch {
      toast("Could not update the session. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {sessions.map((s) => {
          const mine = s.userId === meId;
          if (editing?.id === s.id) {
            return (
              <li key={s.id} className="py-3">
                <form onSubmit={saveEdit} className="flex flex-col gap-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-medium text-muted">Subject</span>
                      <Input
                        value={draft.subject}
                        onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                        maxLength={80}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-muted">Minutes</span>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={draft.minutes}
                        onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-medium text-muted">Notes</span>
                      <Textarea
                        rows={2}
                        value={draft.notes}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        maxLength={2000}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-muted">Date</span>
                      <Input
                        type="date"
                        value={draft.date}
                        max={today}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="px-2.5 py-1.5 text-xs">
                      <CheckIcon width={14} height={14} />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </li>
            );
          }
          return (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Avatar user={s.user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.subject}
                  {mine ? null : (
                    <span className="ml-1 text-xs text-muted">by {s.user.name}</span>
                  )}
                </p>
                {s.notes ? <p className="truncate text-xs text-muted">{s.notes}</p> : null}
              </div>
              <span className="hidden text-xs text-muted sm:inline">{prettyDate(s.date)}</span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                {Math.round(s.minutes / 6) / 10}h
              </span>
              {mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    title="Edit session"
                    aria-label="Edit session"
                    className="text-xs text-muted transition-colors hover:text-ink"
                  >
                    <EditIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(s)}
                    title="Delete session"
                    aria-label="Delete session"
                    className="text-xs text-muted transition-colors hover:text-rose-600"
                  >
                    <XIcon width={16} height={16} />
                  </button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this session?"
        body={
          pending
            ? `"${pending.subject}" (${Math.round(pending.minutes / 6) / 10}h) will be removed from your log.`
            : undefined
        }
        confirmLabel="Delete session"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
