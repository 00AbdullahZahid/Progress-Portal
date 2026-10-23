"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isBlobUrl } from "../validation";
import { deleteBlobs, deletableUrls, claimUploads } from "../blob";
import type { ActionResult } from "./tasks";

const KINDS = ["paper", "notes", "book", "video", "link", "other"] as const;
type Kind = (typeof KINDS)[number];

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

export async function createResource(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const noteRes = cleanText(formData.get("note"), 500, { required: false });
  if (!noteRes.ok) return noteRes;

  const urlRes = parseUrl(formData.get("url"));
  if (!urlRes.ok) return urlRes;
  if (!urlRes.url)
    return { ok: false, error: "Add a link or upload a file first." };

  await db.resource.create({
    data: {
      title: titleRes.value,
      subject: subjectRes.value,
      kind: parseKind(formData.get("kind")),
      note: noteRes.value || null,
      url: urlRes.url,
      addedById: me.id,
    },
  });
  // Only uploaded files need claiming; external links are ignored by cleanup.
  if (isBlobUrl(urlRes.url)) await claimUploads(me.id, [urlRes.url]);
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
