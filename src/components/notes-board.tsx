"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createNote, deleteNote, updateNote } from "@/lib/actions/notes";
import { Avatar } from "./avatar";
import { Button, Card, Input, Textarea, Select, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { FileUpload, type Attached } from "./file-upload";
import { useToast } from "./toast";
import { NotesIcon, PlusIcon, XIcon, EditIcon, CheckIcon, SearchIcon } from "./icons";

export type NoteRow = {
  id: string;
  title: string;
  body: string;
  subject: string;
  image: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: { id: string; name: string; color: string; image?: string | null };
};

type Draft = {
  title: string;
  body: string;
  subject: string;
  image: Attached | null;
  fileUrl: Attached | null;
};

const EMPTY: Draft = { title: "", body: "", subject: "", image: null, fileUrl: null };

function toAttached(url: string | null, name: string | null): Attached | null {
  return url ? { url, name: name || "Attachment", isImage: false } : null;
}

export function NotesBoard({
  notes,
  meId,
  isAdmin,
  subjects,
}: {
  notes: NoteRow[];
  meId: string;
  isAdmin: boolean;
  subjects: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState<NoteRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (subject && n.subject !== subject) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q)
      );
    });
  }, [notes, query, subject]);

  async function submit(fd: FormData) {
    if (draft.image) fd.set("image", draft.image.url);
    if (draft.fileUrl) {
      fd.set("fileUrl", draft.fileUrl.url);
      fd.set("fileName", draft.fileUrl.name);
    }
    setBusy(true);
    try {
      const res = await createNote(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Note added", "success");
      setDraft(EMPTY);
      setCreating(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(n: NoteRow) {
    setEditingId(n.id);
    setEditDraft({
      title: n.title,
      body: n.body,
      subject: n.subject,
      image: n.image ? { url: n.image, name: "Image", isImage: true } : null,
      fileUrl: toAttached(n.fileUrl, n.fileName),
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    const fd = new FormData();
    fd.set("noteId", editingId);
    fd.set("title", editDraft.title);
    fd.set("body", editDraft.body);
    fd.set("subject", editDraft.subject);
    fd.set("image", editDraft.image?.url ?? "");
    fd.set("fileUrl", editDraft.fileUrl?.url ?? "");
    fd.set("fileName", editDraft.fileUrl?.name ?? "");
    setBusy(true);
    try {
      const res = await updateNote(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Note updated", "success");
      setEditingId(null);
      router.refresh();
    } catch {
      toast("Could not save the note. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const fd = new FormData();
    fd.set("noteId", id);
    try {
      const res = await deleteNote(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Note removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        {creating ? (
          <form action={submit} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <NotesIcon width={18} height={18} className="text-brand" />
              New note
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input
                  name="title"
                  maxLength={120}
                  required
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. Binary search tree notes"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                <Input
                  name="subject"
                  maxLength={60}
                  required
                  list="note-subjects"
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  placeholder="e.g. Data Structures"
                />
                <datalist id="note-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Note</span>
              <Textarea
                name="body"
                rows={5}
                maxLength={20000}
                required
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="Write your notes, links or key points…"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FileUpload
                kind="image"
                label="Image (optional)"
                value={draft.image}
                onChange={(v) => setDraft((d) => ({ ...d, image: v }))}
              />
              <FileUpload
                kind="file"
                label="Attachment (optional)"
                value={draft.fileUrl}
                onChange={(v) => setDraft((d) => ({ ...d, fileUrl: v }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="px-3 py-1.5 text-sm">
                <CheckIcon width={15} height={15} />
                {busy ? "Saving…" : "Add note"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="px-3 py-1.5 text-sm"
                onClick={() => {
                  setCreating(false);
                  setDraft(EMPTY);
                }}
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
            Add a note for the group
          </button>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="pl-9"
            aria-label="Search notes"
          />
        </div>
        <Select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Filter by subject"
          className="w-auto"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<NotesIcon />}
          title={notes.length === 0 ? "No notes yet" : "No notes match"}
          hint={
            notes.length === 0
              ? "Add the first note; only the author or an admin can edit or delete it later."
              : "Try a different search or subject filter."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => {
            const mine = n.authorId === meId;
            if (editingId === n.id) {
              return (
                <Card key={n.id} className="flex flex-col gap-3">
                  <Input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    maxLength={120}
                    aria-label="Title"
                  />
                  <Input
                    value={editDraft.subject}
                    onChange={(e) => setEditDraft((d) => ({ ...d, subject: e.target.value }))}
                    maxLength={60}
                    aria-label="Subject"
                  />
                  <Textarea
                    rows={5}
                    value={editDraft.body}
                    onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                    maxLength={20000}
                    aria-label="Note"
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <FileUpload
                      kind="image"
                      label="Image"
                      value={editDraft.image}
                      onChange={(v) => setEditDraft((d) => ({ ...d, image: v }))}
                    />
                    <FileUpload
                      kind="file"
                      label="Attachment"
                      value={editDraft.fileUrl}
                      onChange={(v) => setEditDraft((d) => ({ ...d, fileUrl: v }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      className="px-2.5 py-1.5 text-xs"
                      onClick={saveEdit}
                    >
                      <CheckIcon width={14} height={14} />
                      {busy ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              );
            }
            return (
              <Card key={n.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{n.title}</h3>
                  <div className="flex shrink-0 items-center gap-1">
                    {(mine || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setPending(n)}
                        title="Delete note"
                        aria-label="Delete note"
                        className="text-muted transition-colors hover:text-rose-600"
                      >
                        <XIcon width={15} height={15} />
                      </button>
                    )}
                    {(mine || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        title="Edit note"
                        aria-label="Edit note"
                        className="text-muted transition-colors hover:text-ink"
                      >
                        <EditIcon width={15} height={15} />
                      </button>
                    )}
                  </div>
                </div>
                <span className="w-fit rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">
                  {n.subject}
                </span>
                <p className="whitespace-pre-wrap break-words text-sm text-muted line-clamp-6">
                  {n.body}
                </p>
                {n.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded blob
                  <img src={n.image} alt="" className="h-32 w-full rounded-lg object-cover" />
                ) : null}
                {n.fileUrl ? (
                  <a
                    href={n.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-brand underline"
                  >
                    {n.fileName || "Attachment"}
                  </a>
                ) : null}
                <div className="mt-1 flex items-center gap-2 border-t border-border pt-2">
                  <Avatar user={n.author} size="sm" />
                  <span className="truncate text-xs text-muted">
                    {mine ? "You" : n.author.name}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this note?"
        body={pending ? `"${pending.title}" will be removed for everyone.` : undefined}
        confirmLabel="Delete note"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
