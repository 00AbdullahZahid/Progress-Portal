"use client";

type UploadResult =
  | {
      ok: true;
      url: string;
      name: string;
      isImage: boolean;
      size: number;
      mime: string;
    }
  | { ok: false; error: string };

/**
 * Upload a single file to the app's blob storage endpoint.
 * Returns a friendly error instead of throwing so callers can toast it.
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.set("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json().catch(() => null)) as
      | {
          url?: string;
          name?: string;
          isImage?: boolean;
          size?: number;
          mime?: string;
          error?: string;
        }
      | null;
    if (!res.ok || !data?.url) {
      return { ok: false, error: data?.error ?? "Upload failed. Please try again." };
    }
    return {
      ok: true,
      url: data.url,
      name: data.name ?? file.name,
      isImage: Boolean(data.isImage),
      size: typeof data.size === "number" ? data.size : file.size,
      mime: data.mime ?? file.type,
    };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}
