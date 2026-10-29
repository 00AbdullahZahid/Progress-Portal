"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isBlobUrl } from "../validation";
import { deleteBlobs, deletableUrls, claimUploads, attachmentError } from "../blob";
import type { ActionResult } from "./tasks";

const KINDS = ["paper", "notes", "book", "video", "link", "other"] as const;
type Kind = (typeof KINDS)[number];

export type ResourceActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function refresh() {
  revalidatePath("/resources");
}

function parseKind(value: unknown): Kind {
  const v = String(value ?? "");
  return (KINDS as readonly string[]).includes(v) ? (v as Kind) : "other";
}

/**
 * A resource is either a link or an uploaded file. External links are allowed
 * here (unlike attachments) but restricted to http(s).
 */
function parseUrl(value: unknown): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, url: null };
  if (isBlobUrl(raw)) return { ok: true, url: raw };
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:")
      return { ok: true, url: u.toString().slice(0, 500) };
  } catch {}
  return { ok: false, error: "Enter a valid link or upload a file." };
}

function optionalNumber(value: unknown, min: number, max: number): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function createResource(formData: FormData): Promise<ResourceActionResult> {
  const me = await requireUser();
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const noteRes = cleanText(formData.get("note"), 500, { required: false });
  if (!noteRes.ok) return noteRes;

  const urlRes = parseUrl(formData.get("url"));
  if (!urlRes.ok) return urlRes;
  if (!urlRes.url) return { ok: false, error: "Add a link or upload a file first." };

  if (isBlobUrl(urlRes.url)) {
    const attachment = await attachmentError(me.id, [[urlRes.url, null]]);
    if (attachment) return { ok: false, error: attachment };
  }

  const kind = parseKind(formData.get("kind"));
  const fileNameRes = cleanText(formData.get("fileName"), 200, { required: false });
  if (!fileNameRes.ok) return fileNameRes;
  const mimeRes = cleanText(formData.get("mime"), 120, { required: false });
  if (!mimeRes.ok) return mimeRes;
  const semesterRes = cleanText(formData.get("semester"), 30, { required: false });
  if (!semesterRes.ok) return semesterRes;
  const examTypeRes = cleanText(formData.get("examType"), 40, { required: false });
  if (!examTypeRes.ok) return examTypeRes;

  // Reuse the existing spelling of a subject so "Islamic Studies" and
  // "Islamic studies" do not become two groups.
  const existingSubjects = await db.resource.findMany({
    select: { subject: true },
    distinct: ["subject"],
  });
  const canonicalSubject =
    existingSubjects.find(
      (row) => row.subject.trim().toLowerCase() === subjectRes.value.toLowerCase()
    )?.subject ?? subjectRes.value;

  const resource = await db.resource.create({
    data: {
      title: titleRes.value,
      subject: canonicalSubject,
      kind,
      note: noteRes.value || null,
      url: urlRes.url,
      fileName: fileNameRes.value || null,
      fileSize: optionalNumber(formData.get("fileSize"), 0, 3_500_000),
      mime: mimeRes.value || null,
      year: kind === "paper" ? optionalNumber(formData.get("year"), 1900, 2100) : null,
      semester: kind === "paper" ? semesterRes.value || null : null,
      examType: kind === "paper" ? examTypeRes.value || null : null,
      addedById: me.id,
    },
  });
  // Only uploaded files need claiming; external links are ignored by cleanup.
  if (isBlobUrl(urlRes.url)) await claimUploads(me.id, [urlRes.url]);
  refresh();
  return { ok: true, id: resource.id };
}

export async function updateResource(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("resourceId") ?? "").trim();
  if (!id) return { ok: false, error: "Resource not found." };
  const existing = await db.resource.findUnique({
    where: { id },
    select: { addedById: true, url: true },
  });
  if (!existing) return { ok: false, error: "Resource not found." };
  if (existing.addedById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the person who added it or an admin can edit it." };

  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const noteRes = cleanText(formData.get("note"), 500, { required: false });
  if (!noteRes.ok) return noteRes;
  const kind = parseKind(formData.get("kind"));
  const semesterRes = cleanText(formData.get("semester"), 30, { required: false });
  if (!semesterRes.ok) return semesterRes;
  const examTypeRes = cleanText(formData.get("examType"), 40, { required: false });
  if (!examTypeRes.ok) return examTypeRes;

  const existingSubjects = await db.resource.findMany({
    select: { subject: true },
    distinct: ["subject"],
  });
  const canonicalSubject =
    existingSubjects.find(
      (row) => row.subject.trim().toLowerCase() === subjectRes.value.toLowerCase()
    )?.subject ?? subjectRes.value;

  await db.resource.update({
    where: { id },
    data: {
      title: titleRes.value,
      subject: canonicalSubject,
      kind,
      note: noteRes.value || null,
      year: kind === "paper" ? optionalNumber(formData.get("year"), 1900, 2100) : null,
      semester: kind === "paper" ? semesterRes.value || null : null,
      examType: kind === "paper" ? examTypeRes.value || null : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteResource(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("resourceId") ?? "");
  const res = await db.resource.findUnique({
    where: { id },
    select: { addedById: true, url: true },
  });
  if (!res) return { ok: false, error: "Resource not found." };
  if (res.addedById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the person who added it or an admin can remove it." };

  await db.resource.delete({ where: { id } });
  // Remove the uploaded file too, once nothing else references it. External
  // links are skipped by the blob URL check.
  const safe = await deletableUrls(db, null, [res.url], { requireOwnerId: false });
  await deleteBlobs(safe);
  refresh();
  return { ok: true };
}

async function toggleJoin(
  table: "favorite" | "useful" | "read",
  resourceId: string,
  userId: string
): Promise<void> {
  if (table === "favorite") {
    const existing = await db.resourceFavorite.findUnique({
      where: { resourceId_userId: { resourceId, userId } },
    });
    if (existing)
      await db.resourceFavorite.delete({
        where: { resourceId_userId: { resourceId, userId } },
      });
    else await db.resourceFavorite.create({ data: { resourceId, userId } });
    return;
  }
  if (table === "useful") {
    const existing = await db.resourceUseful.findUnique({
      where: { resourceId_userId: { resourceId, userId } },
    });
    if (existing)
      await db.resourceUseful.delete({
        where: { resourceId_userId: { resourceId, userId } },
      });
    else await db.resourceUseful.create({ data: { resourceId, userId } });
    return;
  }
  const existing = await db.resourceRead.findUnique({
    where: { resourceId_userId: { resourceId, userId } },
  });
  if (existing)
    await db.resourceRead.delete({
      where: { resourceId_userId: { resourceId, userId } },
    });
  else await db.resourceRead.create({ data: { resourceId, userId } });
}

export async function toggleResourceFavorite(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { ok: false, error: "Resource not found." };
  await toggleJoin("favorite", resourceId, me.id);
  refresh();
  return { ok: true };
}

export async function toggleResourceUseful(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { ok: false, error: "Resource not found." };
  await toggleJoin("useful", resourceId, me.id);
  refresh();
  return { ok: true };
}

export async function toggleResourceRead(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { ok: false, error: "Resource not found." };
  await toggleJoin("read", resourceId, me.id);
  refresh();
  return { ok: true };
}
