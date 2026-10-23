import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import {
  ALLOWED_TYPES,
  IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  extensionOf,
  hasValidSignature,
  safeName,
} from "@/lib/upload-rules";

export const runtime = "nodejs";

/** Short, loggable description of an unknown error without leaking internals. */
function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (err) {
    // Anything unexpected (signature check, auth, request parsing) lands here.
    console.error("[upload] unexpected error:", describe(err));
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

async function handleUpload(request: Request) {
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File must be under 3.5MB." },
      { status: 413 }
    );
  }

  // `.get` on a Map can't be tricked by "constructor"/"__proto__" the way a
  // plain object could.
  const allowedExtensions = ALLOWED_TYPES.get(file.type);
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

  let url: string;
  try {
    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    url = blob.url;
  } catch (err) {
    // Most common here: BLOB_READ_WRITE_TOKEN is missing, revoked, or belongs
    // to a Blob store that is not linked to this project.
    console.error("[upload] put() failed:", describe(err));
    return NextResponse.json(
      { error: "Storage is unavailable right now. Please try again later." },
      { status: 502 }
    );
  }

  // Record ownership so actions can later prove who a file belongs to before
  // deleting it. `claimedAt` stays null until a form attaches it to a row.
  try {
    await db.upload.create({
      data: {
        url,
        ownerId: me.id,
        mime: file.type,
        size: file.size,
      },
    });
  } catch (err) {
    // Without a tracking row the cleanup job can never find this file, so it
    // would become a permanent orphan. Remove it and report a failure instead.
    console.error("[upload] failed to record Upload row:", describe(err));
    try {
      await del(url);
    } catch {
      // Best effort — the file may already be gone.
    }
    return NextResponse.json(
      { error: "Could not save the upload. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url,
    name: file.name,
    size: file.size,
    isImage,
  });
}
