import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
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

  try {
    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    // Record ownership so actions can later prove who a file belongs to before
    // deleting it. `claimedAt` stays null until a form attaches it to a row.
    await db.upload.create({
      data: {
        url: blob.url,
        ownerId: me.id,
        mime: file.type,
        size: file.size,
      },
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
