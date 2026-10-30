"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isValidDateString } from "../validation";
import { todayStr } from "../dates";
import { queueWebhookAlert } from "../alerts";
import { resolveSubjectId } from "../subject-link";
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

  const kind = parseKind(formData.get("kind"));
  const subjectId = await resolveSubjectId(
    formData.get("subjectId"),
    subjectRes.value
  );
  await db.exam.create({
    data: {
      title: titleRes.value,
      subject: subjectRes.value,
      subjectId,
      kind,
      date,
      notes: notesRes.value || null,
      createdById: me.id,
    },
  });

  // Ping the group immediately when a date-only item is added for today or
  // tomorrow. It is treated as due at the start of that day.
  const today = todayStr(me.timezone);
  const days = Math.round(
    (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000
  );
  if (days >= 0 && days <= 1) {
    queueWebhookAlert(
      `Urgent ${kind} added\n${titleRes.value} (${subjectRes.value}) is due ${
        days === 0 ? "today" : "tomorrow"
      }.`
    );
  }

  refresh();
  return { ok: true };
}

export async function updateExam(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("examId") ?? "").trim();
  if (!id) return { ok: false, error: "Not found." };

  const exam = await db.exam.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!exam) return { ok: false, error: "Not found." };
  if (exam.createdById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the creator or an admin can edit this." };

  const titleRes = cleanText(formData.get("title"), 120);
  if (!titleRes.ok) return titleRes;
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const notesRes = cleanText(formData.get("notes"), 500, { required: false });
  if (!notesRes.ok) return notesRes;

  const date = String(formData.get("date") ?? "").trim();
  if (!isValidDateString(date))
    return { ok: false, error: "Please pick a valid date." };

  await db.exam.update({
    where: { id },
    data: {
      title: titleRes.value,
      subject: subjectRes.value,
      subjectId: await resolveSubjectId(formData.get("subjectId"), subjectRes.value),
      kind: parseKind(formData.get("kind")),
      date,
      notes: notesRes.value || null,
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
