"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudySession } from "@/lib/actions/study";
import { Avatar } from "./avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { XIcon } from "./icons";

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
}: {
  sessions: Row[];
  meId: string;
  prettyDate: (date: string) => string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<Row | null>(null);

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

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <Avatar user={s.user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {s.subject}
                {s.userId === meId ? null : (
                  <span className="ml-1 text-xs text-muted">by {s.user.name}</span>
                )}
              </p>
              {s.notes ? <p className="truncate text-xs text-muted">{s.notes}</p> : null}
            </div>
            <span className="hidden text-xs text-muted sm:inline">{prettyDate(s.date)}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
              {Math.round(s.minutes / 6) / 10}h
            </span>
            {s.userId === meId ? (
              <button
                type="button"
                onClick={() => setPending(s)}
                title="Delete session"
                className="text-xs text-muted transition-colors hover:text-rose-600"
              >
                <XIcon width={16} height={16} />
              </button>
            ) : null}
          </li>
        ))}
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
