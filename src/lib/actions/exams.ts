"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isValidDateString } from "../validation";
import type { ActionResult } from "./tasks";

const KINDS = ["exam", "assignment", "quiz", "deadline"] as const;
type Kind = (typeof KINDS)[number];

function refresh() {
  revalidatePath("/exams");
  revalidatePath("/dashboard");
}

function parseKind(value: unknown): Kind {
  const v = String(value ?? "");
  return (KINDS as readonly string[]).includes(v) ? (v as Kind) : "exam";
}

export async function createExam(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();

  const titleRes = cleanText(formData.get("title"), 120);
  if (!titleRes.ok) return titleRes;
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const notesRes = cleanText(formData.get("notes"), 500, { required: false });
  if (!notesRes.ok) return notesRes;

  const date = String(formData.get("date") ?? "").trim();
  if (!isValidDateString(date))
    return { ok: false, error: "Please pick a valid date." };

  await db.exam.create({
    data: {
      title: titleRes.value,
      subject: subjectRes.value,
      kind: parseKind(formData.get("kind")),
      date,
      notes: notesRes.value || null,
      createdById: me.id,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteExam(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("examId") ?? "");
  const exam = await db.exam.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!exam) return { ok: false, error: "Not found." };
  if (exam.createdById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the creator or an admin can delete this." };

  await db.exam.delete({ where: { id } });
  refresh();
  return { ok: true };
}
