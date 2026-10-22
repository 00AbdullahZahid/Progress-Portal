"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText } from "../validation";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/grades");
}

export async function createCourse(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const nameRes = cleanText(formData.get("name"), 100);
  if (!nameRes.ok) return nameRes;
  const credits = Number(formData.get("credits"));
  if (!Number.isInteger(credits) || credits < 0 || credits > 30)
    return { ok: false, error: "Credits must be between 0 and 30." };

  await db.course.create({
    data: { ownerId: me.id, name: nameRes.value, credits },
  });
  refresh();
  return { ok: true };
}

export async function deleteCourse(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("courseId") ?? "");
  const course = await db.course.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!course) return { ok: false, error: "Course not found." };
  if (course.ownerId !== me.id)
    return { ok: false, error: "You can only edit your own courses." };

  await db.course.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function addGradeItem(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true },
  });
  if (!course) return { ok: false, error: "Course not found." };
  if (course.ownerId !== me.id)
    return { ok: false, error: "You can only edit your own courses." };

  const titleRes = cleanText(formData.get("title"), 100);
  if (!titleRes.ok) return titleRes;

  const weight = Number(formData.get("weight"));
  if (!Number.isFinite(weight) || weight < 0 || weight > 100)
    return { ok: false, error: "Weight must be between 0 and 100." };

  const scoreRaw = String(formData.get("score") ?? "").trim();
  let score: number | null = null;
  if (scoreRaw) {
    const s = Number(scoreRaw);
    if (!Number.isFinite(s) || s < 0 || s > 100)
      return { ok: false, error: "Score must be between 0 and 100." };
    score = Math.round(s);
  }

  await db.gradeItem.create({
    data: { courseId, title: titleRes.value, weight: Math.round(weight), score },
  });
  refresh();
  return { ok: true };
}

export async function deleteGradeItem(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("itemId") ?? "");
  const item = await db.gradeItem.findUnique({
    where: { id },
    include: { course: { select: { ownerId: true } } },
  });
  if (!item) return { ok: false, error: "Item not found." };
  if (item.course.ownerId !== me.id)
    return { ok: false, error: "You can only edit your own courses." };

  await db.gradeItem.delete({ where: { id } });
  refresh();
  return { ok: true };
}
