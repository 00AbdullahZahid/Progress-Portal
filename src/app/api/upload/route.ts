import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// 4 MB cap on uploads. Vercel functions default to a small body limit, and this
// keeps avatars and study attachments small.
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_DOCS = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ALLOWED_MIME = [...ALLOWED_IMAGE, ...ALLOWED_DOCS];

/** Only letters, numbers, dot, dash and underscore in the stored name. */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "file";
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
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
      { error: "File must be under 4MB." },
      { status: 413 }
    );
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "That file type isn't allowed." },
      { status: 415 }
    );
  }

  const isImage = ALLOWED_IMAGE.includes(file.type);
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
