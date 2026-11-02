import { db } from "./db";

export type ResolvedSubject = { id: string; name: string };

/** Find the shared Subject for a free-text name (trimmed, case-insensitive). */
export async function findSubjectIdByName(raw: unknown): Promise<string | null> {
  const name = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return null;

  const subject = await db.subject.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return subject?.id ?? null;
}

/**
 * Prefer an explicit subject id when the form sends one; otherwise fall back to
 * the free-text name. Unknown ids are ignored so a stale form can't fail.
 * Used by the timetable, whose subject link is optional.
 */
export async function resolveSubjectId(
  rawId: unknown,
  rawName: unknown
): Promise<string | null> {
  const id = String(rawId ?? "").trim();
  if (id) {
    const subject = await db.subject.findUnique({
      where: { id },
      select: { id: true },
    });
    if (subject) return subject.id;
  }
  return findSubjectIdByName(rawName);
}

/**
 * Resolve a required subject selection. Forms now submit `subjectId`; the
 * legacy `subject` text is only accepted as a fallback for stale forms and is
 * never allowed to create an unlinked row.
 */
export async function requireSubject(
  formData: FormData
): Promise<{ ok: true; subject: ResolvedSubject } | { ok: false; error: string }> {
  const id = String(formData.get("subjectId") ?? "").trim();
  if (id) {
    const subject = await db.subject.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!subject)
      return { ok: false, error: "That subject no longer exists. Pick another." };
    return { ok: true, subject };
  }

  const name = String(formData.get("subject") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Choose a subject." };

  const subject = await db.subject.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  if (!subject)
    return { ok: false, error: "Choose a subject from the list." };
  return { ok: true, subject };
}
