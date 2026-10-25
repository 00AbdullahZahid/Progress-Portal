"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText } from "../validation";
import { queueWebhookAlert } from "../alerts";
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
  queueWebhookAlert(
    `New doubt in ${subjectRes.value}\n${me.name}: ${titleRes.value}\n${bodyRes.value.slice(0, 400)}`
  );
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

/** Load the accepted answer plus the question context needed for a note/card. */
async function loadAcceptedAnswer(answerId: string) {
  if (!answerId) return null;
  const answer = await db.answer.findUnique({
    where: { id: answerId },
    include: {
      question: {
        select: { id: true, title: true, subject: true, body: true },
      },
      author: { select: { name: true } },
    },
  });
  return answer?.accepted ? answer : null;
}

/**
 * Save an accepted answer into the shared notes. Any member can keep a copy;
 * the note belongs to the member who clicked, not the answer's author.
 */
export async function saveAnswerAsNote(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const answerId = String(formData.get("answerId") ?? "").trim();
  const answer = await loadAcceptedAnswer(answerId);
  if (!answer) return { ok: false, error: "Accepted answer not found." };

  const title = answer.question.title.slice(0, 120);
  const body = `Accepted answer to "${answer.question.title}" by ${answer.author.name}\n\n${answer.body}\n\nQuestion:\n${answer.question.body}`.slice(
    0,
    20_000
  );

  const existing = await db.note.findFirst({
    where: { authorId: me.id, title, body },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "You already saved this answer to notes." };

  await db.note.create({
    data: {
      authorId: me.id,
      title,
      body,
      subject: answer.question.subject,
    },
  });
  revalidatePath("/notes");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Turn an accepted answer into a flashcard. The question is the prompt and the
 * answer is the back of the card.
 */
export async function saveAnswerAsFlashcard(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const answerId = String(formData.get("answerId") ?? "").trim();
  const answer = await loadAcceptedAnswer(answerId);
  if (!answer) return { ok: false, error: "Accepted answer not found." };
  if (answer.body.length > 1000)
    return {
      ok: false,
      error: "This answer is too long for a flashcard. Save it to Notes instead.",
    };

  const existing = await db.flashcard.findFirst({
    where: {
      createdById: me.id,
      deck: answer.question.subject,
      front: answer.question.title,
      back: answer.body,
    },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "You already made a flashcard from this answer." };

  await db.flashcard.create({
    data: {
      deck: answer.question.subject,
      front: answer.question.title,
      back: answer.body,
      createdById: me.id,
    },
  });
  revalidatePath("/flashcards");
  return { ok: true };
}
