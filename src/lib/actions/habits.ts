"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";
import type { ActionResult } from "./tasks";

export type { ActionResult };

function refresh() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function createHabit(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Habit name is required." };
  await db.habit.create({ data: { ownerId: me.id, name: name.slice(0, 120) } });
  refresh();
  return { ok: true };
}

export async function toggleCheckIn(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const date = String(formData.get("date") ?? todayStr(me.timezone));
  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.ownerId !== me.id)
    return { ok: false, error: "You can only update your own habits." };
  const existing = await db.habitCheckIn.findUnique({
    where: { habitId_date: { habitId, date } },
  });
  if (existing) {
    await db.habitCheckIn.delete({ where: { id: existing.id } });
  } else {
    await db.habitCheckIn.create({ data: { habitId, date } });
  }
  refresh();
  return { ok: true };
}

export async function deleteHabit(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.ownerId !== me.id)
    return { ok: false, error: "You can only delete your own habits." };
  await db.habit.delete({ where: { id: habitId } });
  refresh();
  return { ok: true };
}
