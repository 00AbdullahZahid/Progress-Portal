import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { shiftDate, todayStr } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upcoming items for the installed Android app to schedule as local
 * notifications. Only the signed-in member's own assigned tasks are returned;
 * exams are shared across the group. Event preferences are respected so
 * turning a reminder off in Settings cancels it on the next sync.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const today = todayStr(me.timezone);
  const horizon = new Date(Date.now() + 30 * 86_400_000);

  const [tasks, exams] = await Promise.all([
    me.notifyTaskDue
      ? db.task.findMany({
          where: {
            assignees: { some: { userId: me.id } },
            status: { not: "done" },
            dueDate: { not: null, gte: new Date(Date.now() - 86_400_000), lte: horizon },
          },
          orderBy: { dueDate: "asc" },
          take: 40,
          select: { id: true, title: true, dueDate: true },
        })
      : Promise.resolve([]),
    me.notifyExamReminders
      ? db.exam.findMany({
          where: { date: { gte: today, lte: shiftDate(today, 60) } },
          orderBy: { date: "asc" },
          take: 40,
          select: { id: true, title: true, subject: true, kind: true, date: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    tasks: tasks.flatMap((task) =>
      task.dueDate === null
        ? []
        : [
            {
              id: task.id,
              title: task.title,
              dueDate: task.dueDate.toISOString(),
            },
          ],
    ),
    exams,
  });
}
