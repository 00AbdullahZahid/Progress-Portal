"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import type { ActionResult } from "./tasks";

/** Update the signed-in user's digest preferences. */
export async function setNotificationPrefs(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: {
      notifyTasks: formData.get("notifyTasks") === "on",
      notifyExams: formData.get("notifyExams") === "on",
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

/** Update which events create an in-app notification and a push. */
export async function setNotificationEventPrefs(
  formData: FormData
): Promise<ActionResult> {
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: {
      notifyTaskAssigned: formData.get("notifyTaskAssigned") === "on",
      notifyTaskComments: formData.get("notifyTaskComments") === "on",
      notifyTaskStatus: formData.get("notifyTaskStatus") === "on",
      notifyTaskDue: formData.get("notifyTaskDue") === "on",
      notifyNewProjects: formData.get("notifyNewProjects") === "on",
      notifyChatMentions: formData.get("notifyChatMentions") === "on",
      notifyExamReminders: formData.get("notifyExamReminders") === "on",
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

/** Turn browser push delivery on or off for the signed-in member. */
export async function setPushPreference(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: { notifyPush: formData.get("enabled") === "on" },
  });
  revalidatePath("/settings");
  return { ok: true };
}

