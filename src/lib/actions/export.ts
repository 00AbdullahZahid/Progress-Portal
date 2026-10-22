"use server";

import { db } from "../db";
import { requireUser } from "../auth";

/**
 * Build a JSON snapshot of the signed-in user's own data. Only rows they own
 * are included, and study notes/attachments are kept (they belong to the user).
 * Returned as a plain object so the client can hand it to a download.
 */
export async function exportMyData(): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const me = await requireUser();

  const [sessions, habits, habitCheckins, tasks, notes, exams, courses, reviews] =
    await Promise.all([
      db.studySession.findMany({
        where: { userId: me.id },
        orderBy: { date: "desc" },
        select: {
          subject: true,
          minutes: true,
          notes: true,
          date: true,
          shared: true,
          image: true,
          fileUrl: true,
          createdAt: true,
        },
      }),
      db.habit.findMany({
        where: { ownerId: me.id },
        select: { name: true, createdAt: true },
      }),
      db.habitCheckIn.findMany({
        where: { habit: { ownerId: me.id } },
        select: { date: true, habit: { select: { name: true } } },
      }),
      db.task.findMany({
        where: { assigneeId: me.id },
        select: {
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
        },
      }),
      db.note.findMany({
        where: { authorId: me.id },
        select: {
          title: true,
          subject: true,
          body: true,
          createdAt: true,
        },
      }),
      db.exam.findMany({
        where: { createdById: me.id },
        select: { title: true, subject: true, kind: true, date: true },
      }),
      db.course.findMany({
        where: { ownerId: me.id },
        select: {
          name: true,
          credits: true,
          items: { select: { title: true, weight: true, score: true } },
        },
      }),
      db.flashcardReview.findMany({
        where: { userId: me.id },
        select: { box: true, dueAt: true, card: { select: { front: true } } },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { handle: me.handle, name: me.name },
    studySessions: sessions,
    habits,
    habitCheckins: habitCheckins.map((c) => ({ date: c.date, habit: c.habit.name })),
    tasks,
    notes,
    exams,
    courses,
    flashcardReviews: reviews.map((r) => ({
      front: r.card.front,
      box: r.box,
      dueAt: r.dueAt,
    })),
  };

  return { ok: true, json: JSON.stringify(payload, null, 2) };
}
