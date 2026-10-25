"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logStudy } from "@/lib/actions/study";
import { uploadFile } from "@/lib/upload-client";
import { Card, Button, Input, Textarea } from "./ui";
import { PlusIcon } from "./icons";
import { useToast } from "./toast";

type Uploaded = { url: string; name: string; isImage: boolean };

export function StudyForm({ today }: { today: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<Uploaded | null>(null);
  const [file, setFile] = useState<Uploaded | null>(null);
  const [shared, setShared] = useState(false);

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setImage({ url: res.url, name: res.name, isImage: res.isImage });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > 3.5 * 1024 * 1024) {
      toast("File must be under 3.5MB", "error");
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
    setFile({ url: res.url, name: res.name, isImage: res.isImage });
  }

  async function action(fd: FormData) {
    if (image) {
      fd.set("image", image.url);
    }
    if (file) {
      fd.set("fileUrl", file.url);
      fd.set("fileName", file.name);
    }
    if (shared) {
      fd.set("shared", "true");
    }
    setPending(true);
    try {
      const res = await logStudy(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Session logged", "success");
      formRef.current?.reset();
      setImage(null);
      setFile(null);
      setShared(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <PlusIcon width={18} height={18} className="text-brand" />
        Log a session
      </h2>
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <div>
          <label htmlFor="study-subject" className="mb-1 block text-xs font-medium text-muted">
            Subject
          </label>
          <Input
            id="study-subject"
            name="subject"
            placeholder="e.g. React, System Design"
            maxLength={80}
            required
          />
        </div>
        <div>
          <label htmlFor="study-minutes" className="mb-1 block text-xs font-medium text-muted">
            Minutes
          </label>
          <Input
            id="study-minutes"
            type="number"
            name="minutes"
            min={1}
            max={1440}
            placeholder="60"
            required
          />
        </div>
        <div>
          <label htmlFor="study-date" className="mb-1 block text-xs font-medium text-muted">
            Date
          </label>
          <Input id="study-date" type="date" name="date" defaultValue={today} max={today} required />
        </div>
        <div>
          <label htmlFor="study-notes" className="mb-1 block text-xs font-medium text-muted">
            Notes (optional)
          </label>
          <Textarea
            id="study-notes"
            name="notes"
            rows={2}
            maxLength={2000}
            placeholder="What did you cover?"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Upload image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            disabled={uploading}
            className="w-full max-w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:bg-surface disabled:opacity-50 sm:text-sm"
          />
          {image ? (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={image.url} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="text-xs text-muted underline hover:text-ink"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Attach a file (optional)</label>
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
            onChange={onFileChange}
            disabled={uploading}
            className="w-full max-w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:bg-surface disabled:opacity-50 sm:text-sm"
          />
          {file ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-muted">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted underline hover:text-ink"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="rounded border-border"
          />
          Share this session with the group
        </label>
        <p className="text-xs text-muted">
          Uploaded files are stored with a public, hard-to-guess link. Anyone who
          has the link can open it, even after you unshare, so don&apos;t upload
          anything you wouldn&apos;t want copied.
        </p>
        <Button type="submit" disabled={pending || uploading}>
          {uploading ? "Uploading…" : pending ? "Logging…" : "Log session"}
        </Button>
      </form>
    </Card>
  );
}
