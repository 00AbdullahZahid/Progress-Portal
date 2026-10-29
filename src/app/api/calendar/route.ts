import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCalendarToken } from "@/lib/auth";
import { buildCalendar } from "@/lib/calendar";
import { dateInTz, todayStr } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only calendar subscription. The signed token is the only credential, so
 * the feed works in Google Calendar, Apple Calendar, and Outlook without a
 * browser session. Reset a password to revoke the token.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = await verifyCalendarToken(token);
  if (!payload) {
    return new NextResponse("Invalid or expired calendar link.", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, tokenVersion: true, timezone: true },
  });
  if (!user || !user.isActive || user.tokenVersion !== payload.v) {
    return new NextResponse("Invalid or expired calendar link.", { status: 401 });
  }

  const today = todayStr(user.timezone);
  const [exams, taskRows, classes] = await Promise.all([
    db.exam.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        subject: true,
        kind: true,
        date: true,
        notes: true,
      },
      take: 500,
    }),
    db.task.findMany({
      where: {
        assignees: { some: { userId: user.id } },
        status: { not: "done" },
        dueDate: { not: null },
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        dueDate: true,
        project: { select: { name: true } },
      },
      take: 500,
    }),
    db.timetableEntry.findMany({
      where: { OR: [{ scope: "group" }, { ownerId: user.id }] },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: {
        id: true,
        title: true,
        weekday: true,
        startMin: true,
        endMin: true,
        location: true,
      },
      take: 200,
    }),
  ]);

  const tasks = taskRows
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate ? dateInTz(task.dueDate, user.timezone) : "",
      projectName: task.project?.name ?? "No project",
    }))
    .filter((task) => task.dueDate && task.dueDate >= today);

  const ics = buildCalendar({
    today,
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      kind: exam.kind,
      date: exam.date,
      notes: exam.notes,
    })),
    tasks,
    classes,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="group-portal.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
