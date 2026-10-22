"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";
import { cleanText, isBlobUrl, validateLogDate } from "../validation";
import { deleteBlobs } from "../blob";
import type { ActionResult } from "./tasks";

const MAX_MINUTES = 24 * 60;

function refresh() {
  revalidatePath("/study");
  revalidatePath("/dashboard");
}

/** Normalize a subject so "React", " react " and "REACT" group together. */
function normalizeSubject(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  // Title-case the first letter of each word, preserve the rest lowercased,
  // but leave acronyms of 2-5 uppercase letters untouched (e.g. "SQL", "AWS").
  return trimmed
    .split(" ")
    .map((word) => {
      if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseMinutes(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > MAX_MINUTES) return null;
  return rounded;
}

export async function logStudy(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();

  const subjectRes = cleanText(formData.get("subject"), 80);
  if (!subjectRes.ok) return subjectRes;

  const minutes = parseMinutes(formData.get("minutes"));
  if (minutes === null)
    return {
      ok: false,
      error: `Minutes must be between 1 and ${MAX_MINUTES}.`,
    };

  const notesRes = cleanText(formData.get("notes"), 2000, { required: false });
  if (!notesRes.ok) return notesRes;

  const today = todayStr(me.timezone);
  const dateRes = validateLogDate(String(formData.get("date") ?? today), today);
  if (!dateRes.ok) return dateRes;

  const image = formData.get("image");
  const fileUrl = formData.get("fileUrl");
  const fileName = formData.get("fileName");
  const shared = formData.get("shared") === "true";

  let imageData: string | null = null;
  if (image && typeof image === "string" && image.trim()) {
    const value = image.trim();
    // Only our own Blob storage is accepted — no external links, no base64.
    if (!isBlobUrl(value) || value.length > 500) {
      return { ok: false, error: "That image couldn't be saved." };
    }
    imageData = value;
  }

  let url: string | null = null;
  if (fileUrl && typeof fileUrl === "string" && fileUrl.trim()) {
    const value = fileUrl.trim();
    if (!isBlobUrl(value) || value.length > 500)
      return { ok: false, error: "Attachments must be uploaded through the app." };
    url = value;
  }
  let name: string | null = null;
  if (fileName && typeof fileName === "string" && fileName.trim()) {
    name = fileName.trim().slice(0, 200);
  }

  await db.studySession.create({
    data: {
      userId: me.id,
      subject: normalizeSubject(subjectRes.value),
      minutes,
      notes: notesRes.value || null,
      date: dateRes.date,
      image: imageData,
      fileUrl: url,
      fileName: name,
      shared,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateStudySession(
  formData: FormData
): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("sessionId") ?? "");

  const existing = await db.studySession.findUnique({ where: { id } });
  if (!existing || existing.userId !== me.id)
    return { ok: false, error: "You can only edit your own sessions." };

  const subjectRes = cleanText(formData.get("subject"), 80);
  if (!subjectRes.ok) return subjectRes;

  const minutes = parseMinutes(formData.get("minutes"));
  if (minutes === null)
    return { ok: false, error: `Minutes must be between 1 and ${MAX_MINUTES}.` };

  const notesRes = cleanText(formData.get("notes"), 2000, { required: false });
  if (!notesRes.ok) return notesRes;

  const today = todayStr(me.timezone);
  const dateRes = validateLogDate(String(formData.get("date") ?? existing.date), today);
  if (!dateRes.ok) return dateRes;

  // Attachments are optional on edit; only touch them when the form sends them.
  const imageRaw = formData.get("image");
  const fileUrlRaw = formData.get("fileUrl");
  const fileNameRaw = formData.get("fileName");
  const sharedRaw = formData.get("shared");

  const data: {
    subject: string;
    minutes: number;
    notes: string | null;
    date: string;
    image?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    shared?: boolean;
  } = {
    subject: normalizeSubject(subjectRes.value),
    minutes,
    notes: notesRes.value || null,
    date: dateRes.date,
  };

  if (imageRaw !== null) {
    const value = String(imageRaw).trim();
    if (!value) data.image = null;
    else if (isBlobUrl(value) && value.length <= 500) data.image = value;
    else return { ok: false, error: "That image couldn't be saved." };
  }

  if (fileUrlRaw !== null) {
    const value = String(fileUrlRaw).trim();
    if (!value) {
      data.fileUrl = null;
      data.fileName = null;
    } else if (isBlobUrl(value) && value.length <= 500) {
      data.fileUrl = value;
      data.fileName = fileNameRaw ? String(fileNameRaw).trim().slice(0, 200) : null;
    } else {
      return { ok: false, error: "Attachments must be uploaded through the app." };
    }
  }

  if (sharedRaw !== null) data.shared = String(sharedRaw) === "true";

  await db.studySession.update({ where: { id }, data });

  // Remove blobs that this edit replaced or cleared.
  await deleteBlobs([
    existing.image !== data.image ? existing.image : null,
    existing.fileUrl !== data.fileUrl ? existing.fileUrl : null,
  ]);

  refresh();
  return { ok: true };
}

export async function deleteStudySession(
  formData: FormData
): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("sessionId") ?? "");
  if (!id) return { ok: false, error: "Session not found." };

  // Read first so we know which blobs to clean up after the row is gone.
  const existing = await db.studySession.findUnique({
    where: { id },
    select: { userId: true, image: true, fileUrl: true },
  });
  if (!existing || existing.userId !== me.id)
    return { ok: false, error: "You can only delete your own sessions." };

  await db.studySession.delete({ where: { id } });
  await deleteBlobs([existing.image, existing.fileUrl]);

  refresh();
  return { ok: true };
}
