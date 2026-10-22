"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createResource, deleteResource } from "@/lib/actions/resources";
import { FileUpload, type Attached } from "./file-upload";
import { Avatar } from "./avatar";
import { Button, Card, Input, Select, Textarea, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { BookIcon, PlusIcon, XIcon } from "./icons";

export type ResourceRow = {
  id: string;
  title: string;
  subject: string;
  kind: string;
  url: string | null;
  note: string | null;
  addedById: string;
  addedBy: { id: string; name: string; color: string; image?: string | null };
};

const KINDS = ["paper", "notes", "book", "video", "link", "other"] as const;

export function ResourcesBoard({
  resources,
  meId,
  isAdmin,
  subjects,
}: {
  resources: ResourceRow[];
  meId: string;
  isAdmin: boolean;
  subjects: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [file, setFile] = useState<Attached | null>(null);
  const [pending, setPending] = useState<ResourceRow | null>(null);
  const [filter, setFilter] = useState("");

  async function submit(fd: FormData) {
    // A link takes priority; otherwise the uploaded file's URL is used.
    fd.set("url", link.trim() || file?.url || "");
    if (file) fd.set("title", fd.get("title") || file.name);
    setBusy(true);
    try {
      const res = await createResource(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Resource added", "success");
      setCreating(false);
      setLink("");
      setFile(null);
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
    fd.set("resourceId", id);
    try {
      const res = await deleteResource(fd);
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

  const shown = filter ? resources.filter((r) => r.subject === filter) : resources;
  const bySubject = new Map<string, ResourceRow[]>();
  for (const r of shown) {
    const list = bySubject.get(r.subject) ?? [];
    list.push(r);
    bySubject.set(r.subject, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
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
        <Button type="button" variant="outline" className="ml-auto" onClick={() => setCreating((c) => !c)}>
          <PlusIcon width={16} height={16} />
          Add resource
        </Button>
      </Card>

      {creating ? (
        <Card className="p-4">
          <form action={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input name="title" maxLength={160} required placeholder="e.g. Past paper 2023" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                <Input name="subject" maxLength={60} required list="res-subjects" />
                <datalist id="res-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Kind</span>
                <Select name="kind" defaultValue="paper">
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Link (optional)</span>
                <Input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>
            <FileUpload
              kind="file"
              label="Or upload a file (optional)"
              value={file}
              onChange={setFile}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Note (optional)</span>
              <Textarea name="note" rows={2} maxLength={500} />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="px-3 py-1.5 text-sm">
                <PlusIcon width={15} height={15} />
                {busy ? "Saving…" : "Add"}
              </Button>
              <Button type="button" variant="outline" className="px-3 py-1.5 text-sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon={<BookIcon />}
          title="No resources yet"
          hint="Build a shelf of past papers, books and links, organised by subject."
        />
      ) : (
        [...bySubject.entries()].map(([subject, list]) => (
          <Card key={subject} className="p-4">
            <h2 className="mb-3 font-semibold">
              {subject} <span className="text-xs font-normal text-muted">({list.length})</span>
            </h2>
            <ul className="flex flex-col divide-y divide-border">
              {list.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.kind}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <Avatar user={r.addedBy} size="sm" />
                  {r.addedById === meId || isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setPending(r)}
                      title="Remove"
                      aria-label="Remove"
                      className="text-muted transition-colors hover:text-rose-600"
                    >
                      <XIcon width={15} height={15} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Remove this resource?"
        body={pending ? `"${pending.title}" will be removed for everyone.` : undefined}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
