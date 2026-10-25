"use server";

import { db } from "../db";
import { requireUser } from "../auth";
import { toCsv } from "../csv";

/** Load only the signed-in member's own rows for a data export. */
async function loadMyData(userId: string) {
  return Promise.all([
    db.studySession.findMany({
      where: { userId },
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
        task: { select: { title: true } },
      },
    }),
    db.habit.findMany({
      where: { ownerId: userId },
      select: { name: true, createdAt: true },
    }),
    db.habitCheckIn.findMany({
      where: { habit: { ownerId: userId } },
      select: { date: true, habit: { select: { name: true } } },
    }),
    db.task.findMany({
      where: { assigneeId: userId },
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
    db.note.findMany({
      where: { authorId: userId },
      select: {
        title: true,
        subject: true,
        body: true,
        createdAt: true,
      },
    }),
    db.exam.findMany({
      where: { createdById: userId },
      select: { title: true, subject: true, kind: true, date: true, notes: true },
    }),
    db.course.findMany({
      where: { ownerId: userId },
      select: {
        name: true,
        credits: true,
        items: { select: { title: true, weight: true, score: true } },
      },
    }),
    db.flashcardReview.findMany({
      where: { userId },
      select: { box: true, dueAt: true, card: { select: { front: true } } },
    }),
  ]);
}

function isoDay(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/**
 * Build a JSON snapshot of the signed-in user's own data. Only rows they own
 * are included, and study notes/attachments are kept (they belong to the user).
 * Returned as a plain object so the client can hand it to a download.
 */
export async function exportMyData(): Promise<
  { ok: true; json: string } | { ok: false; error: string }
> {
  const me = await requireUser();
  const [sessions, habits, habitCheckins, tasks, notes, exams, courses, reviews] =
    await loadMyData(me.id);

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

/**
 * A flat CSV with a record_type column so tasks, sessions, habits, notes, exams,
 * courses, grade items, and flashcard reviews can be filtered in a spreadsheet.
 */
export async function exportMyDataCsv(): Promise<
  { ok: true; csv: string } | { ok: false; error: string }
> {
  const me = await requireUser();
  const [sessions, habits, habitCheckins, tasks, notes, exams, courses, reviews] =
    await loadMyData(me.id);

  const rows: (string | number)[][] = [];

  for (const s of sessions) {
    const details = [s.task ? `task: ${s.task.title}` : "", s.notes ?? ""]
      .filter(Boolean)
      .join("\n");
    rows.push([
      "study_session",
      s.subject,
      s.subject,
      s.date,
      s.shared ? "shared" : "private",
      s.minutes,
      "",
      "",
      details,
    ]);
  }

  for (const h of habits) {
    rows.push(["habit", h.name, "", isoDay(h.createdAt), "", "", "", "", ""]);
  }

  for (const c of habitCheckins) {
    rows.push(["habit_checkin", c.habit.name, "", c.date, "", "", "", "", ""]);
  }

  for (const t of tasks) {
    rows.push([
      "task",
      t.title,
      t.project.name,
      isoDay(t.dueDate),
      t.status,
      "",
      "",
      "",
      `priority: ${t.priority}; created: ${isoDay(t.createdAt)}`,
    ]);
  }

  for (const n of notes) {
    rows.push([
      "note",
      n.title,
      n.subject,
      isoDay(n.createdAt),
      "",
      "",
      "",
      "",
      n.body,
    ]);
  }

  for (const e of exams) {
    rows.push([
      "exam",
      e.title,
      e.subject,
      e.date,
      e.kind,
      "",
      "",
      "",
      e.notes ?? "",
    ]);
  }

  for (const c of courses) {
    rows.push(["course", c.name, "", "", "course", "", "", "", `credits: ${c.credits}`]);
    for (const item of c.items) {
      rows.push([
        "grade_item",
        item.title,
        c.name,
        "",
        item.score == null ? "ungraded" : "graded",
        "",
        item.weight,
        item.score ?? "",
        `${c.credits} credit course`,
      ]);
    }
  }

  for (const r of reviews) {
    rows.push([
      "flashcard_review",
      r.card.front,
      "",
      isoDay(r.dueAt),
      `box ${r.box}`,
      "",
      "",
      "",
      "",
    ]);
  }

  const csv = toCsv(
    [
      "record_type",
      "title",
      "subject",
      "date",
      "status",
      "minutes",
      "weight",
      "score",
      "details",
    ],
    rows
  );

  return { ok: true, csv };
}
