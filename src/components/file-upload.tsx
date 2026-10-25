"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";
import { useToast } from "./toast";

export type Attached = { url: string; name: string; isImage: boolean };

const IMAGE_MAX = 2 * 1024 * 1024;
const FILE_MAX = 3.5 * 1024 * 1024;

/**
 * A small file picker that uploads to the app's blob endpoint and reports the
 * stored URL. Shared by notes, sessions and resources so the upload UX and size
 * limits stay identical everywhere.
 */
export function FileUpload({
  kind,
  label,
  value,
  onChange,
}: {
  kind: "image" | "file";
  label: string;
  value: Attached | null;
  onChange: (next: Attached | null) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = kind === "image" ? IMAGE_MAX : FILE_MAX;
    if (file.size > max) {
      toast(
        kind === "image" ? "Image must be under 2MB" : "File must be under 3.5MB",
        "error"
      );
      e.target.value = "";
      return;
    }
    setUploading(true);
    const res = await uploadFile(file);
    setUploading(false);
    if (!res.ok) {
      toast(res.error, "error");
      e.target.value = "";
      return;
    }
    onChange({ url: res.url, name: res.name, isImage: res.isImage });
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={kind === "image" ? "image/*" : ".pdf,.txt,.doc,.docx,.xls,.xlsx"}
          onChange={pick}
          disabled={uploading}
          className="w-full max-w-full min-w-0 text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-surface2 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink hover:file:bg-surface disabled:opacity-50"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="max-w-[9rem] truncate text-[11px] text-muted underline hover:text-ink"
            title={value.name}
          >
            {value.name} &times;
          </button>
        ) : uploading ? (
          <span className="text-[11px] text-muted">Uploading…</span>
        ) : null}
      </div>
      {kind === "image" && value ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img
          src={value.url}
          alt="Preview"
          className="mt-1 h-16 w-16 rounded-lg object-cover"
        />
      ) : null}
    </div>
  );
}
