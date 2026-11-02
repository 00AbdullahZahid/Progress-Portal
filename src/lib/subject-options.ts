/**
 * Client-safe subject helpers. Kept separate from `subject-link.ts` so client
 * components can import the option type without pulling in the database.
 */
export type SubjectOption = {
  id: string;
  name: string;
  archivedAt?: Date | string | null;
};

/**
 * Find the subject a legacy row belongs to. Newer rows already carry a
 * `subjectId`; older rows only have the display string, so fall back to a
 * trimmed, case-insensitive name match.
 */
export function subjectIdFor(
  name: string,
  subjectId: string | null | undefined,
  subjects: SubjectOption[]
): string {
  if (subjectId) return subjectId;
  const key = name.trim().toLowerCase();
  if (!key) return "";
  return (
    subjects.find((subject) => subject.name.trim().toLowerCase() === key)?.id ??
    ""
  );
}
