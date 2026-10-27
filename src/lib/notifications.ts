import { after } from "next/server";
import type { NotificationKind } from "@prisma/client";
import { db } from "./db";
import { dateInTz, shiftDate, todayStr } from "./dates";
import { pushConfigured, sendPushToUsers, type PushPayload } from "./push";

type PrefField =
  | "notifyTaskAssigned"
  | "notifyTaskComments"
  | "notifyTaskStatus"
  | "notifyTaskDue"
  | "notifyNewProjects"
  | "notifyChatMentions"
  | "notifyExamReminders";

const PREF_FOR_KIND: Record<NotificationKind, PrefField> = {
  task_assigned: "notifyTaskAssigned",
  task_comment: "notifyTaskComments",
  task_mention: "notifyTaskComments",
  task_status: "notifyTaskStatus",
  task_due: "notifyTaskDue",
  project_new: "notifyNewProjects",
  chat_mention: "notifyChatMentions",
  exam_due: "notifyExamReminders",
};

type NewNotification = {
  audience: "all" | string[];
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
  /** Base key; the recipient id is appended automatically. */
  dedupeKey?: string;
  excludeUserId?: string;
};

function queuePush(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !pushConfigured()) return;

  try {
    after(async () => {
      await sendPushToUsers(userIds, payload).catch(() => {});
    });
  } catch {
    // Outside a request context (scripts, tests), send best-effort.
    void sendPushToUsers(userIds, payload).catch(() => {});
  }
}

/**
 * Create in-app notifications for active members who opted into this event,
 * then queue a browser push for anyone who enabled push. Notification failures
 * are logged but never fail the action that triggered them.
 */
export async function notifyUsers(
  input: NewNotification
): Promise<{ created: number; pushRecipients: number }> {
  try {
    const users = await db.user.findMany({
      where: {
        isActive: true,
        ...(input.audience === "all" ? {} : { id: { in: input.audience } }),
      },
      select: {
        id: true,
        notifyTaskAssigned: true,
        notifyTaskComments: true,
        notifyTaskStatus: true,
        notifyTaskDue: true,
        notifyNewProjects: true,
        notifyChatMentions: true,
        notifyExamReminders: true,
        notifyPush: true,
      },
    });

    const pref = PREF_FOR_KIND[input.kind];
    let recipients = users.filter(
      (user) => user[pref] && user.id !== input.excludeUserId
    );

    if (recipients.length === 0) return { created: 0, pushRecipients: 0 };

    if (input.dedupeKey) {
      const keys = recipients.map((user) => `${input.dedupeKey}:${user.id}`);
      const existing = await db.notification.findMany({
        where: { dedupeKey: { in: keys } },
        select: { dedupeKey: true },
      });
      const seen = new Set(existing.map((row) => row.dedupeKey));
      recipients = recipients.filter(
        (user) => !seen.has(`${input.dedupeKey}:${user.id}`)
      );
    }

    if (recipients.length === 0) return { created: 0, pushRecipients: 0 };

    await db.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        dedupeKey: input.dedupeKey
          ? `${input.dedupeKey}:${user.id}`
          : undefined,
      })),
      skipDuplicates: true,
    });

    const pushUserIds = recipients
      .filter((user) => user.notifyPush)
      .map((user) => user.id);
    queuePush(pushUserIds, {
      title: input.title,
      body: input.body,
      href: input.href,
      tag: input.dedupeKey ?? input.href ?? "portal",
    });

    return { created: recipients.length, pushRecipients: pushUserIds.length };
  } catch (err) {
    console.error("[notifications] could not create notification:", err);
    return { created: 0, pushRecipients: 0 };
  }
}

/**
 * Daily "due today / overdue" task reminders and exam/deadline reminders for
 * tomorrow. Both are deduped per member, item and local calendar day so a later
 * cron run cannot post the same reminder twice.
 */
export async function buildDueNotifications(): Promise<{
  created: number;
  checkedMembers: number;
  examReminders: number;
}> {
  const users = await db.user.findMany({
    where: {
      isActive: true,
      OR: [{ notifyTaskDue: true }, { notifyExamReminders: true }],
    },
    select: {
      id: true,
      timezone: true,
      notifyTaskDue: true,
      notifyExamReminders: true,
    },
  });

  let created = 0;
  let examReminders = 0;
  for (const user of users) {
    const today = todayStr(user.timezone);
    const tomorrow = shiftDate(today, 1);

    if (user.notifyTaskDue) {
      const horizon = new Date(Date.now() + 36 * 60 * 60 * 1000);
      const tasks = await db.task.findMany({
        where: {
          assignees: { some: { userId: user.id } },
          status: { not: "done" },
          dueDate: { not: null, lte: horizon },
        },
        orderBy: { dueDate: "asc" },
        select: { id: true, title: true, dueDate: true },
        take: 20,
      });

      for (const task of tasks) {
        if (!task.dueDate) continue;
        const due = dateInTz(task.dueDate, user.timezone);
        if (due > today) continue;

        const result = await notifyUsers({
          audience: [user.id],
          kind: "task_due",
          title: due < today ? "Task overdue" : "Task due today",
          body: task.title,
          href: `/tasks#task-${task.id}`,
          dedupeKey: `task_due:${task.id}:${today}`,
        });
        created += result.created;
      }
    }

    if (user.notifyExamReminders) {
      const exams = await db.exam.findMany({
        where: { date: { in: [today, tomorrow] } },
        orderBy: { date: "asc" },
        select: { id: true, title: true, subject: true, kind: true, date: true },
        take: 20,
      });

      for (const exam of exams) {
        const label =
          exam.kind === "assignment"
            ? "Assignment"
            : exam.kind === "quiz"
              ? "Quiz"
              : exam.kind === "deadline"
                ? "Deadline"
                : "Exam";
        const when = exam.date === today ? "today" : "tomorrow";
        const result = await notifyUsers({
          audience: [user.id],
          kind: "exam_due",
          title: `${label} ${when}`,
          body: `${exam.title} (${exam.subject})`,
          href: "/exams",
          dedupeKey: `exam_due:${exam.id}:${today}`,
        });
        created += result.created;
        examReminders += result.created;
      }
    }
  }

  return { created, checkedMembers: users.length, examReminders };
}
