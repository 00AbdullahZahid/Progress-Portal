"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText } from "../validation";
import type { ActionResult } from "./tasks";

// Spaced repetition: box 1..5, each box maps to how many days until the next
// review. A correct answer promotes the card; a wrong answer demotes it to box 1.
const BOX_DAYS = [0, 1, 2, 4, 8, 16];

function refresh() {
  revalidatePath("/flashcards");
}

/** A tiny, deterministic shuffle so a review session isn't always in order. */
function nextDueFor(box: number, correct: boolean): { box: number; dueAt: Date } {
  const nextBox = correct ? Math.min(box + 1, BOX_DAYS.length - 1) : 1;
  const days = BOX_DAYS[nextBox];
  const dueAt = new Date(Date.now() + days * 86_400_000);
  return { box: nextBox, dueAt };
}

export async function createFlashcard(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const deckRes = cleanText(formData.get("deck"), 60);
  if (!deckRes.ok) return deckRes;
  const frontRes = cleanText(formData.get("front"), 500);
  if (!frontRes.ok) return frontRes;
  const backRes = cleanText(formData.get("back"), 1000);
  if (!backRes.ok) return backRes;

  await db.flashcard.create({
    data: {
      deck: deckRes.value,
      front: frontRes.value,
      back: backRes.value,
      createdById: me.id,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateFlashcard(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("cardId") ?? "").trim();
  if (!id) return { ok: false, error: "Card not found." };
  const card = await db.flashcard.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!card) return { ok: false, error: "Card not found." };
  if (card.createdById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the creator or an admin can edit this card." };

  const deckRes = cleanText(formData.get("deck"), 60);
  if (!deckRes.ok) return deckRes;
  const frontRes = cleanText(formData.get("front"), 500);
  if (!frontRes.ok) return frontRes;
  const backRes = cleanText(formData.get("back"), 1000);
  if (!backRes.ok) return backRes;

  await db.flashcard.update({
    where: { id },
    data: { deck: deckRes.value, front: frontRes.value, back: backRes.value },
  });
  refresh();
  return { ok: true };
}

export async function deleteFlashcard(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("cardId") ?? "");
  const card = await db.flashcard.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!card) return { ok: false, error: "Card not found." };
  if (card.createdById !== me.id && me.role !== "admin")
    return { ok: false, error: "Only the creator or an admin can delete this card." };

  await db.flashcard.delete({ where: { id } });
  refresh();
  return { ok: true };
}

/** Record a review for the signed-in user and advance the card's schedule. */
export async function reviewFlashcard(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const cardId = String(formData.get("cardId") ?? "");
  const correct = String(formData.get("correct") ?? "") === "true";
  const card = await db.flashcard.findUnique({
    where: { id: cardId },
    select: { id: true },
  });
  if (!card) return { ok: false, error: "Card not found." };

  const existing = await db.flashcardReview.findUnique({
    where: { cardId_userId: { cardId, userId: me.id } },
  });
  const { box, dueAt } = nextDueFor(existing?.box ?? 1, correct);

  await db.flashcardReview.upsert({
    where: { cardId_userId: { cardId, userId: me.id } },
    create: {
      cardId,
      userId: me.id,
      box,
      dueAt,
      lastResult: correct ? "correct" : "wrong",
    },
    update: { box, dueAt, lastResult: correct ? "correct" : "wrong" },
  });
  // Don't revalidate the whole page on each swipe; the client tracks progress.
  return { ok: true };
}
