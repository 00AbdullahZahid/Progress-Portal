import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Vercel's request body limit is ~4.5MB, and multipart adds overhead on top of
// the file bytes, so cap files below that to stay safely under the limit.
const MAX_BYTES = 3.5 * 1024 * 1024;

// Allowed types, each with the file extensions we accept for it. SVG and HTML
// are deliberately excluded: they can execute script when served.
const TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
};

const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** The lowercased extension without the dot, or "" when there is none. */
function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Only letters, numbers, dot, dash and underscore in the stored name. */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "file";
}

/**
 * Check the first bytes of the file against its declared type. This is a cheap
 * defense against a renamed executable or an HTML page posing as an image; the
 * browser's `file.type` alone can't be trusted.
 */
async function hasValidSignature(file: File, mime: string): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const match = (...bytes: number[]) =>
    bytes.every((b, i) => head[i] === b);

  switch (mime) {
    case "image/png":
      return match(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return match(0xff, 0xd8, 0xff);
    case "image/gif":
      // "GIF87a" or "GIF89a"
      return (
        match(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) ||
        match(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
      );
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        match(0x52, 0x49, 0x46, 0x46) &&
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50
      );
    case "application/pdf":
      return match(0x25, 0x50, 0x44, 0x46); // "%PDF"
    default:
      // Office documents are ZIP/CFB containers; a strict signature check adds
      // little here and risks false negatives across versions.
      return true;
  }
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Per-user quota: 20 uploads per hour. Best-effort on serverless.
  const limit = rateLimit(`upload:${me.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Upload limit reached. Try again in ${Math.ceil(
          limit.retryAfterSeconds / 60
        )} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage is not configured on this deployment." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be under 3.5MB." },
      { status: 413 }
    );
  }

  const allowedExtensions = TYPES[file.type];
  if (!allowedExtensions) {
    return NextResponse.json(
      { error: "That file type isn't allowed." },
      { status: 415 }
    );
  }
  if (!allowedExtensions.includes(extensionOf(file.name))) {
    return NextResponse.json(
      { error: "The file's extension doesn't match its type." },
      { status: 415 }
    );
  }
  if (!(await hasValidSignature(file, file.type))) {
    return NextResponse.json(
      { error: "That file doesn't look like a valid file of its type." },
      { status: 415 }
    );
  }

  const isImage = IMAGE_MIME.has(file.type);
  const folder = isImage ? "images" : "files";
  const path = `uploads/${folder}/${me.id}-${Date.now()}-${safeName(file.name)}`;

  try {
    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    return NextResponse.json({
      url: blob.url,
      name: file.name,
      size: file.size,
      isImage,
    });
  } catch {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
