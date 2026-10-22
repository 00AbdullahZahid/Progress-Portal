"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText } from "../validation";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/questions");
}

export async function createQuestion(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const subjectRes = cleanText(formData.get("subject"), 60);
  if (!subjectRes.ok) return subjectRes;
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;
  const bodyRes = cleanText(formData.get("body"), 5000);
  if (!bodyRes.ok) return bodyRes;

  await db.question.create({
    data: {
      subject: subjectRes.value,
      title: titleRes.value,
      body: bodyRes.value,
      authorId: me.id,
    },
  });
  refresh();
  return { ok: true };
}

export async function createAnswer(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const questionId = String(formData.get("questionId") ?? "");
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) return { ok: false, error: "Question not found." };

  const bodyRes = cleanText(formData.get("body"), 5000);
  if (!bodyRes.ok) return bodyRes;

  await db.answer.create({
    data: { questionId, body: bodyRes.value, authorId: me.id },
  });
  refresh();
  return { ok: true };
}

/** Mark one answer as accepted (only the question's author may do this). */
export async function acceptAnswer(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const answerId = String(formData.get("answerId") ?? "");
  const answer = await db.answer.findUnique({
    where: { id: answerId },
    include: { question: { select: { authorId: true } } },
  });
  if (!answer) return { ok: false, error: "Answer not found." };
  if (answer.question.authorId !== me.id)
    return { ok: false, error: "Only the asker can accept an answer." };

  // One accepted answer per question.
  await db.$transaction([
    db.answer.updateMany({
      where: { questionId: answer.questionId },
      data: { accepted: false },
    }),
    db.answer.update({ where: { id: answerId }, data: { accepted: true } }),
  ]);
  refresh();
  return { ok: true };
}

export async function deleteQuestion(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("questionId") ?? "");
  const question = await db.question.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!question) return { ok: false, error: "Question not found." };
  if (question.authorId !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the asker or an admin can delete this." };

  await db.question.delete({ where: { id } });
  refresh();
  return { ok: true };
}
