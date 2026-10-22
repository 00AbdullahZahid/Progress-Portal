"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import type { ActionResult } from "./tasks";

/**
 * Set (or clear) the signed-in user's weekly study goal, in minutes.
 * Zero clears the goal.
 */
export async function setWeeklyGoal(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const hours = Number(formData.get("weeklyGoalHours"));
  if (!Number.isFinite(hours) || hours < 0 || hours > 168)
    return { ok: false, error: "Enter a weekly goal between 0 and 168 hours." };

  const minutes = Math.round(hours * 60);
  await db.user.update({
    where: { id: me.id },
    data: { weeklyGoalMinutes: minutes },
  });
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
