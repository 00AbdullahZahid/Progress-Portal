"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudySession, updateStudySession } from "@/lib/actions/study";
import { uploadFile } from "@/lib/upload-client";
import { Avatar } from "./avatar";
import { Button, Input, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { XIcon, EditIcon, CheckIcon } from "./icons";
import { prettyDate } from "@/lib/dates";

type Row = {
  id: string;
  subject: string;
  minutes: number;
  notes: string | null;
  date: string;
  userId: string;
  user: { id: string; name: string; color: string; image?: string | null };
  image?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  shared?: boolean;
};

export function SessionList({
  sessions,
  meId,
  today,
}: {
  sessions: Row[];
  meId: string;
  today: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState({ subject: "", minutes: "", notes: "", date: "" });
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<{ url: string; name: string } | null>(null);
  const [editShared, setEditShared] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    setEditImage(s.image ?? null);
    setEditFile(s.fileUrl ? { url: s.fileUrl, name: s.fileName || "Attachment" } : null);
    setEditShared(Boolean(s.shared));
  }

  async function onEditImage(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > 2 * 1024 * 1024) {
      toast("Image must be under 2MB", "error");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const res = await uploadFile(picked);
    setUploading(false);
    if (!res.ok) {
      toast(res.error, "error");
      e.target.value = "";
      return;
    }
    setEditImage(res.url);
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
    // Always send these so clearing them sticks.
    fd.set("image", editImage ?? "");
    if (editFile) {
      fd.set("fileUrl", editFile.url);
      fd.set("fileName", editFile.name);
    } else {
      fd.set("fileUrl", "");
    }
    fd.set("shared", editShared ? "true" : "false");
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

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-medium text-muted">
                        Image (optional)
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onEditImage}
                          disabled={uploading}
                          className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-surface2 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink hover:file:bg-surface disabled:opacity-50"
                        />
                        {editImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                            <img
                              src={editImage}
                              alt="Preview"
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setEditImage(null)}
                              className="text-[11px] text-muted underline hover:text-ink"
                            >
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-muted">
                        Attachment
                      </span>
                      <Input
                        value={editFile?.url ?? ""}
                        placeholder="https://..."
                        onChange={(e) =>
                          setEditFile(
                            e.target.value.trim()
                              ? { url: e.target.value, name: editFile?.name || "Attachment" }
                              : null
                          )
                        }
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editShared}
                      onChange={(e) => setEditShared(e.target.checked)}
                      className="rounded border-border"
                    />
                    Shared with the group
                  </label>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving || uploading} className="px-2.5 py-1.5 text-xs">
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
                  {s.shared ? (
                    <span className="ml-2 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] text-brand">
                      Shared
                    </span>
                  ) : null}
                </p>
                {s.notes ? <p className="truncate text-xs text-muted">{s.notes}</p> : null}
                {(s.image || s.fileUrl) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded blob
                      <img src={s.image} alt="Study" className="h-16 w-16 rounded-lg object-cover" />
                    ) : null}
                    {s.fileUrl ? (
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand underline"
                      >
                        {s.fileName || "Open link/file"}
                      </a>
                    ) : null}
                  </div>
                )}
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
