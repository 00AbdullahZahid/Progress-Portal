"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { todayStr } from "../dates";

function refresh() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function createHabit(formData: FormData) {
  "use server";
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.habit.create({ data: { ownerId: me.id, name } });
  refresh();
}

export async function toggleCheckIn(formData: FormData) {
  "use server";
  const me = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const date = String(formData.get("date") ?? todayStr(me.timezone));
  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.ownerId !== me.id) return;
  const existing = await db.habitCheckIn.findUnique({
    where: { habitId_date: { habitId, date } },
  });
  if (existing) {
    await db.habitCheckIn.delete({ where: { id: existing.id } });
  } else {
    await db.habitCheckIn.create({ data: { habitId, date } });
  }
  refresh();
}

export async function deleteHabit(formData: FormData) {
  "use server";
  const me = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.ownerId !== me.id) return;
  await db.habit.delete({ where: { id: habitId } });
  refresh();
}
