"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminUpdateUser,
  adminCreateUser,
  adminSetActive,
  adminDeleteUser,
} from "@/lib/actions/admin";
import { Card, Button, Input, Select } from "./ui";
import { Avatar } from "./avatar";
import { uploadFile } from "@/lib/upload-client";
import { ConfirmDialog } from "./confirm-dialog";
import { ShieldIcon, PlusIcon, XIcon, CheckIcon } from "./icons";
import { useToast } from "./toast";

type Member = {
  id: string;
  handle: string;
  name: string;
  role: string;
  color: string;
  timezone: string;
  isActive: boolean;
  image?: string | null;
};

const COLORS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Indigo", value: "#6366f1" },
];

export function AdminUserManager({
  members,
  meId,
  timezoneOptions,
}: {
  members: Member[];
  meId: string;
  timezoneOptions: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [msg, setMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);
  // Per-user photo overrides while editing (undefined = leave untouched).
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function uploadPhoto(id: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be under 2MB", "error");
      return;
    }
    setUploadingId(id);
    const res = await uploadFile(file);
    setUploadingId(null);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    setPhotos((p) => ({ ...p, [id]: res.url }));
  }

  function save(fd: FormData) {
    const id = String(fd.get("userId"));
    const name = String(fd.get("name") ?? "");
    // Only send the photo field when this row was edited, so untouched users
    // keep their current photo.
    if (Object.prototype.hasOwnProperty.call(photos, id)) {
      fd.set("image", photos[id] ?? "");
    }
    setMsg(null);
    setSavingId(id);
    startTransition(async () => {
      try {
        const res = (await adminUpdateUser(fd)) as { ok?: boolean; error?: string } | undefined;
        if (res?.error) {
          setMsg({ id, type: "err", text: res.error });
          toast(res.error, "error");
        } else {
          setMsg({ id, type: "ok", text: "Saved." });
          toast(`${name} updated`, "success");
        }
        router.refresh();
      } catch {
        toast("Could not save changes. Please try again.", "error");
      } finally {
        setSavingId(null);
      }
    });
  }

  function create(fd: FormData) {
    const name = String(fd.get("name") ?? "");
    setCreating(true);
    startTransition(async () => {
      try {
        const res = (await adminCreateUser(fd)) as { ok?: boolean; error?: string } | undefined;
        if (res?.error) {
          toast(res.error, "error");
          return;
        }
        toast(`${name} created`, "success");
        setShowCreate(false);
        router.refresh();
      } catch {
        toast("Could not create the user. Please try again.", "error");
      } finally {
        setCreating(false);
      }
    });
  }

  function toggleActive(m: Member) {
    const fd = new FormData();
    fd.set("userId", m.id);
    fd.set("active", m.isActive ? "0" : "1");
    setSavingId(m.id);
    startTransition(async () => {
      try {
        const res = (await adminSetActive(fd)) as { ok?: boolean; error?: string } | undefined;
        if (res?.error) {
          toast(res.error, "error");
          return;
        }
        toast(m.isActive ? `${m.name} deactivated` : `${m.name} reactivated`, "success");
        router.refresh();
      } catch {
        toast("Could not update the account. Please try again.", "error");
      } finally {
        setSavingId(null);
      }
    });
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const m = confirmDelete;
    setConfirmDelete(null);
    const fd = new FormData();
    fd.set("userId", m.id);
    try {
      const res = await adminDeleteUser(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(`${m.name} deleted`, "success");
      router.refresh();
    } catch {
      toast("Could not delete the user. Please try again.", "error");
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <ShieldIcon width={18} height={18} className="text-amber-500" />
            Manage users
          </h2>
          <p className="text-sm text-muted">
            Create members, edit anyone&apos;s details, or deactivate an account. Changes apply
            right away.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setShowCreate((v) => !v)}>
          <PlusIcon width={16} height={16} />
          {showCreate ? "Close" : "New user"}
        </Button>
      </div>

      {showCreate ? (
        <form
          action={create}
          className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed border-border p-3"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Name</span>
              <Input name="name" required maxLength={40} placeholder="Full name" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Username</span>
              <Input
                name="handle"
                required
                minLength={2}
                maxLength={20}
                pattern="[a-z0-9_]+"
                placeholder="lowercase_handle"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Temporary password
              </span>
              <Input
                name="password"
                type="text"
                required
                minLength={8}
                maxLength={200}
                placeholder="min 8 characters"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Role</span>
              <Select name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Color</span>
              <Select name="color" defaultValue="#2563eb">
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Timezone</span>
              <Select name="timezone" defaultValue="Asia/Karachi">
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div>
            <Button type="submit" disabled={creating}>
              <PlusIcon width={16} height={16} />
              {creating ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <form
            action={save}
            key={m.id}
            className={`rounded-xl border p-3 ${
              m.isActive ? "border-border bg-surface2/40" : "border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20"
            }`}
          >
            <input type="hidden" name="userId" value={m.id} />
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 flex-col items-center gap-1.5 pt-6">
                <Avatar
                  user={{
                    name: m.name,
                    color: m.color,
                    image:
                      Object.prototype.hasOwnProperty.call(photos, m.id)
                        ? photos[m.id]
                        : m.image,
                  }}
                  size="lg"
                />
                <label className="cursor-pointer text-[10px] text-muted underline hover:text-ink">
                  {uploadingId === m.id ? "Uploading…" : "Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingId === m.id}
                    onChange={(e) => uploadPhoto(m.id, e.target.files?.[0])}
                  />
                </label>
                {Object.prototype.hasOwnProperty.call(photos, m.id) && photos[m.id] ? (
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => ({ ...p, [m.id]: null }))}
                    className="text-[10px] text-muted hover:text-rose-600"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Name</span>
                  <Input name="name" defaultValue={m.name} required maxLength={40} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Username</span>
                  <Input
                    name="handle"
                    defaultValue={m.handle}
                    required
                    minLength={2}
                    maxLength={20}
                    pattern="[a-z0-9_]+"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Role</span>
                  <Select name="role" defaultValue={m.role}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Color</span>
                  <Select name="color" defaultValue={m.color}>
                    {COLORS.some((c) => c.value === m.color) ? null : (
                      <option value={m.color}>{m.color}</option>
                    )}
                    {COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Timezone</span>
                  <Select name="timezone" defaultValue={m.timezone}>
                    {!timezoneOptions.includes(m.timezone) ? (
                      <option value={m.timezone}>{m.timezone}</option>
                    ) : null}
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending && savingId === m.id ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {m.isActive ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckIcon width={11} height={11} />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <XIcon width={11} height={11} />
                  Deactivated
                </span>
              )}

              {m.id === meId ? (
                <span className="text-[11px] text-muted">This is you.</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleActive(m)}
                    disabled={pending}
                    className="text-[11px] font-medium text-muted hover:text-ink"
                  >
                    {m.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(m)}
                    className="text-[11px] font-medium text-muted hover:text-rose-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>

            {msg?.id === m.id ? (
              <p
                className={`mt-2 text-xs ${
                  msg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {msg.text}
              </p>
            ) : null}
          </form>
        ))}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete?.name ?? "user"}?`}
        body="This permanently removes the account and everything it owns: tasks, habits, study sessions, and messages. This cannot be undone."
        confirmLabel="Delete user"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Card>
  );
}
