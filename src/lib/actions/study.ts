"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";
import type { ActionResult } from "./tasks";

export type { ActionResult };

export async function logStudy(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const minutes = Math.max(1, Math.min(24 * 60, Number(formData.get("minutes")) || 0));
  const notes = String(formData.get("notes") ?? "").trim();
  const date = String(formData.get("date") ?? todayStr(me.timezone));
  if (!subject) return { ok: false, error: "Please enter a subject." };
  if (!minutes) return { ok: false, error: "Please enter minutes greater than 0." };
  await db.studySession.create({
    data: {
      userId: me.id,
      subject: subject.slice(0, 120),
      minutes,
      notes: notes ? notes.slice(0, 2000) : null,
      date,
    },
  });
  revalidatePath("/study");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStudySession(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("sessionId") ?? "");
  if (!id) return { ok: false, error: "Session not found." };
  await db.studySession
    .deleteMany({ where: { id, userId: me.id } })
    .catch(() => {});
  revalidatePath("/study");
  revalidatePath("/dashboard");
  return { ok: true };
}
