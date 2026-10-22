"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import type { ActionResult } from "./tasks";

/** Update the signed-in user's notification preferences. */
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
