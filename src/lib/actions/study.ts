"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";

export async function logStudy(formData: FormData) {
  "use server";
  const me = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const minutes = Math.max(1, Math.min(24 * 60, Number(formData.get("minutes")) || 0));
  const notes = String(formData.get("notes") ?? "").trim();
  const date = String(formData.get("date") ?? todayStr(me.timezone));
  if (!subject || !minutes) return;
  await db.studySession.create({
    data: { userId: me.id, subject, minutes, notes: notes || null, date },
  });
  revalidatePath("/study");
  revalidatePath("/dashboard");
}

export async function deleteStudySession(formData: FormData) {
  "use server";
  const me = await requireUser();
  const id = String(formData.get("sessionId") ?? "");
  await db.studySession
    .deleteMany({ where: { id, userId: me.id } })
    .catch(() => {});
  revalidatePath("/study");
  revalidatePath("/dashboard");
}
