"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isBlobUrl } from "../validation";
import { deleteBlobs, deletableUrls, claimUploads, attachmentError } from "../blob";
import { findSubjectIdByName, resolveSubjectId } from "../subject-link";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

type NoteInput = {
  title: string;
  body: string;
  subject: string;
  image: string | null;
  fileUrl: string | null;
  fileName: string | null;
};

/** Parse and validate the shared note fields from a form. */
function parseNote(
  formData: FormData
):
  | { ok: true; value: NoteInput }
  | { ok: false; error: string } {
  const titleRes = cleanText(formData.get("title"), 120);
  if (!titleRes.ok) return titleRes;

  const bodyRes = cleanText(formData.get("body"), 20000);
  if (!bodyRes.ok) return bodyRes;

  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;

  const imageRaw = formData.get("image");
  let image: string | null = null;
  if (imageRaw && typeof imageRaw === "string" && imageRaw.trim()) {
    const value = imageRaw.trim();
    if (!isBlobUrl(value) || value.length > 500)
      return { ok: false, error: "That image couldn't be saved." };
    image = value;
  }

  const fileUrlRaw = formData.get("fileUrl");
  let fileUrl: string | null = null;
  if (fileUrlRaw && typeof fileUrlRaw === "string" && fileUrlRaw.trim()) {
    const value = fileUrlRaw.trim();
    if (!isBlobUrl(value) || value.length > 500)
      return { ok: false, error: "Attachments must be uploaded through the app." };
    fileUrl = value;
  }
  const fileNameRaw = formData.get("fileName");
  const fileName =
    fileUrl && fileNameRaw && typeof fileNameRaw === "string" && fileNameRaw.trim()
      ? fileNameRaw.trim().slice(0, 200)
      : null;

  return {
    ok: true,
    value: {
      title: titleRes.value,
      body: bodyRes.value,
      subject: subjectRes.value,
      image,
      fileUrl,
      fileName,
    },
  };
}

export async function createNote(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const parsed = parseNote(formData);
  if (!parsed.ok) return parsed;

  const attachment = await attachmentError(me.id, [
    [parsed.value.image, null],
    [parsed.value.fileUrl, null],
  ]);
  if (attachment) return { ok: false, error: attachment };

  const subjectId = await findSubjectIdByName(parsed.value.subject);
  await db.note.create({
    data: { authorId: me.id, ...parsed.value, subjectId },
  });
  await claimUploads(me.id, [parsed.value.image, parsed.value.fileUrl]);
  refresh();
  return { ok: true };
}

export async function updateNote(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("noteId") ?? "");
  if (!id) return { ok: false, error: "Note not found." };

  const existing = await db.note.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Note not found." };

  // Editing is limited to the author or an admin, so a teammate can't overwrite
  // or vandalize someone else's note. (Everyone can still read every note.)
  if (existing.authorId !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the author or an admin can edit this note." };

  const parsed = parseNote(formData);
  if (!parsed.ok) return parsed;

  const attachment = await attachmentError(me.id, [
    [parsed.value.image, existing.image],
    [parsed.value.fileUrl, existing.fileUrl],
  ]);
  if (attachment) return { ok: false, error: attachment };

  const subjectId = await resolveSubjectId(
    formData.get("subjectId"),
    parsed.value.subject
  );
  await db.note.update({ where: { id }, data: { ...parsed.value, subjectId } });
  await claimUploads(me.id, [parsed.value.image, parsed.value.fileUrl]);

  // Delete whatever this edit replaced/cleared once nothing references it. No
  // owner gate here: the file might have been uploaded by a different member,
  // and leaving it orphaned would mean the cron never reaps it either. The
  // reference check (excluding this row) is what makes it safe.
  const replaced = [existing.image, existing.fileUrl];
  const safe = await deletableUrls(db, null, replaced, {
    excludeRowId: id,
    requireOwnerId: false,
  });
  await deleteBlobs(safe);

  refresh();
  return { ok: true };
}

export async function deleteNote(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("noteId") ?? "");
  const note = await db.note.findUnique({
    where: { id },
    select: { authorId: true, image: true, fileUrl: true },
  });
  if (!note) return { ok: false, error: "Note not found." };

  // Only the author or an admin may delete a note.
  if (note.authorId !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the author or an admin can delete this note." };

  await db.note.delete({ where: { id } });
  // Nothing references the files anymore (the row is gone), so no owner gate —
  // otherwise an admin deleting a teammate's note would orphan the files.
  const safe = await deletableUrls(db, null, [note.image, note.fileUrl], {
    requireOwnerId: false,
  });
  await deleteBlobs(safe);

  refresh();
  return { ok: true };
}
