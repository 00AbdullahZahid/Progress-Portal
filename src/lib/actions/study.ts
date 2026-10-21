"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";
import { cleanText, validateLogDate } from "../validation";
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

  await db.studySession.create({
    data: {
      userId: me.id,
      subject: normalizeSubject(subjectRes.value),
      minutes,
      notes: notesRes.value || null,
      date: dateRes.date,
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

  await db.studySession.update({
    where: { id },
    data: {
      subject: normalizeSubject(subjectRes.value),
      minutes,
      notes: notesRes.value || null,
      date: dateRes.date,
    },
  });
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
  const result = await db.studySession.deleteMany({
    where: { id, userId: me.id },
  });
  if (result.count === 0)
    return { ok: false, error: "You can only delete your own sessions." };
  refresh();
  return { ok: true };
}
