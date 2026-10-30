import { db } from "./db";

/**
 * Resolve the shared Subject for a free-text subject name. The library forms
 * still store a display string, so link them to the matching Subject when one
 * exists. Matching is trimmed and case-insensitive.
 */
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
