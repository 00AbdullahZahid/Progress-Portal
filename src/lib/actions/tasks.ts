"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireAdmin } from "../auth";
import { cleanText } from "../validation";
import { audit } from "../audit";
import { notifyUsers } from "../notifications";
import { mentionedHandles } from "../mentions";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PRIORITIES = ["low", "med", "high"] as const;
const STATUSES = ["todo", "doing", "done"] as const;

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  // Task titles and deletions appear in linked study sessions.
  revalidatePath("/study");
}

function parseDate(value: unknown): Date | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

/** Admins and the creator may edit every field. Legacy tasks have no creator. */
export function canEditTask(
  user: { id: string; role: string },
  task: { createdById: string | null }
): boolean {
  return (
    user.role === "admin" ||
    task.createdById === user.id ||
    task.createdById === null
  );
}

/**
 * Deleting is stricter than editing: legacy tasks without a creator stay
 * admin-only so an old shared task cannot be removed by accident.
 */
export function canDeleteTask(
  user: { id: string; role: string },
  task: { createdById: string | null }
): boolean {
  return user.role === "admin" || task.createdById === user.id;
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const nameRes = cleanText(formData.get("name"), 120);
  if (!nameRes.ok) return nameRes;

  const project = await db.project.create({ data: { name: nameRes.value } });
  // Every project gets its own chat channel automatically.
  await db.channel.create({
    data: { name: project.name, kind: "project", projectId: project.id },
  });
  await audit(me.id, "project.create", {
    targetId: project.id,
    detail: project.name,
  });
  await notifyUsers({
    audience: "all",
    kind: "project_new",
    title: "New project",
    body: project.name,
    href: "/tasks",
    excludeUserId: me.id,
  });

  refresh();
  revalidatePath("/chat");
  return { ok: true };
}

export async function createGoal(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, error: "Project not found." };

  const target = parseDate(formData.get("targetDate"));
  if (target === "invalid")
    return { ok: false, error: "Please pick a valid target date." };

  const goal = await db.goal.create({
    data: { projectId, title: titleRes.value, targetDate: target },
  });
  await audit(me.id, "goal.create", { targetId: goal.id, detail: goal.title });

  refresh();
  return { ok: true };
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const rawProjectId = String(formData.get("projectId") ?? "").trim();
  const projectId = rawProjectId || null;
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;

  if (projectId) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return { ok: false, error: "Project not found." };
  }

  // The goal, if given, must belong to the same project. Standalone tasks
  // cannot have a goal because goals only exist inside projects.
  const goalId = String(formData.get("goalId") ?? "") || null;
  if (goalId) {
    if (!projectId)
      return { ok: false, error: "Choose a project before selecting a goal." };
    const goal = await db.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.projectId !== projectId)
      return { ok: false, error: "That goal doesn't belong to this project." };
  }

  const assigneeIds = Array.from(
    new Set(
      formData
        .getAll("assigneeIds")
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
  if (assigneeIds.length > 0) {
    const found = await db.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true },
    });
    if (found.length !== assigneeIds.length)
      return { ok: false, error: "One or more assignees were not found." };
  }

  const priority = String(formData.get("priority") ?? "med");
  if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number]))
    return { ok: false, error: "Invalid priority." };

  const due = parseDate(formData.get("dueDate"));
  if (due === "invalid")
    return { ok: false, error: "Please pick a valid due date." };

  const task = await db.task.create({
    data: {
      projectId,
      title: titleRes.value,
      goalId,
      priority: priority as (typeof PRIORITIES)[number],
      dueDate: due,
      createdById: me.id,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
  });
  await audit(me.id, "task.create", { targetId: task.id, detail: task.title });
  await notifyUsers({
    audience: assigneeIds,
    kind: "task_assigned",
    title: "Task assigned to you",
    body: task.title,
    href: `/tasks#task-${task.id}`,
    excludeUserId: me.id,
  });

  refresh();
  return { ok: true };
}

/**
 * Set a task's status. Members may only move their own assigned tasks;
 * admins may move any. Accepts an explicit target status.
 */
export async function setTaskStatus(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!STATUSES.includes(status as (typeof STATUSES)[number]))
    return { ok: false, error: "Invalid status." };

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      completedAt: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return { ok: false, error: "Task not found." };

  const isAssignedToMe = task.assignees.some((a) => a.userId === me.id);
  if (me.role !== "admin" && !isAssignedToMe) {
    return {
      ok: false,
      error: "You can only update tasks assigned to you.",
    };
  }

  if (task.status === status) return { ok: true };

  await db.task.update({
    where: { id: taskId },
    data: {
      status: status as (typeof STATUSES)[number],
      // Keep the original completion time when the task was already done;
      // re-saving "done" should not move the point on the chart.
      completedAt:
        status === "done" ? (task.completedAt ?? new Date()) : null,
    },
  });
  const label =
    status === "todo" ? "To do" : status === "doing" ? "In progress" : "Done";
  await notifyUsers({
    audience: task.assignees.map((assignee) => assignee.userId),
    kind: "task_status",
    title: `Task moved to ${label}`,
    body: task.title,
    href: `/tasks#task-${task.id}`,
    excludeUserId: me.id,
  });
  refresh();
  return { ok: true };
}

/**
 * Edit a task's details. Status stays in `setTaskStatus` so an assignee can
 * move their own task without being able to rename or reassign it.
 */
export async function updateTask(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) return { ok: false, error: "Task not found." };

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, createdById: true },
  });
  if (!task) return { ok: false, error: "Task not found." };
  if (!canEditTask(me, task))
    return { ok: false, error: "Only the creator or an admin can edit this task." };

  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;

  const rawProjectId = String(formData.get("projectId") ?? "").trim();
  const projectId = rawProjectId || null;
  if (projectId) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return { ok: false, error: "Project not found." };
  }

  const goalId = String(formData.get("goalId") ?? "") || null;
  if (goalId) {
    if (!projectId)
      return { ok: false, error: "Choose a project before selecting a goal." };
    const goal = await db.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.projectId !== projectId)
      return { ok: false, error: "That goal doesn't belong to this project." };
  }

  const assigneeIds = Array.from(
    new Set(
      formData
        .getAll("assigneeIds")
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
  if (assigneeIds.length > 0) {
    const found = await db.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true },
    });
    if (found.length !== assigneeIds.length)
      return { ok: false, error: "One or more assignees were not found." };
  }

  const priority = String(formData.get("priority") ?? "med");
  if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number]))
    return { ok: false, error: "Invalid priority." };

  const due = parseDate(formData.get("dueDate"));
  if (due === "invalid")
    return { ok: false, error: "Please pick a valid due date." };

  await db.task.update({
    where: { id: taskId },
    data: {
      title: titleRes.value,
      projectId,
      goalId,
      priority: priority as (typeof PRIORITIES)[number],
      dueDate: due,
      assignees: {
        deleteMany: {},
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
  });
  await audit(me.id, "task.update", { targetId: taskId, detail: titleRes.value });
  refresh();
  return { ok: true };
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { ok: false, error: "Task not found." };
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, createdById: true },
  });
  if (!task) return { ok: false, error: "Task not found." };
  if (!canDeleteTask(me, task))
    return { ok: false, error: "Only the creator or an admin can delete this task." };
  await db.task.delete({ where: { id: taskId } });
  await audit(me.id, "task.delete", { targetId: taskId, detail: task.title });
  refresh();
  return { ok: true };
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { ok: false, error: "Goal not found." };
  const goal = await db.goal.findUnique({ where: { id: goalId } });
  if (!goal) return { ok: false, error: "Goal not found." };
  // Detach tasks from the goal first so they aren't lost, then delete the goal.
  await db.task.updateMany({ where: { goalId }, data: { goalId: null } });
  await db.goal.delete({ where: { id: goalId } });
  await audit(me.id, "goal.delete", { targetId: goalId, detail: goal.title });
  refresh();
  return { ok: true };
}

export async function deleteProject(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "Project not found." };
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, error: "Project not found." };
  // Cascades to goals, tasks, comments, and channels via the schema.
  await db.project.delete({ where: { id: projectId } });
  await audit(me.id, "project.delete", {
    targetId: projectId,
    detail: project.name,
  });
  refresh();
  revalidatePath("/chat");
  return { ok: true };
}

export async function addComment(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const bodyRes = cleanText(formData.get("body"), 2000);
  if (!bodyRes.ok) return bodyRes;

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return { ok: false, error: "Task not found." };

  await db.taskComment.create({
    data: { taskId, authorId: me.id, body: bodyRes.value },
  });

  const handles = mentionedHandles(bodyRes.value, me.handle);
  const mentioned = handles.length
    ? await db.user.findMany({
        where: { handle: { in: handles }, isActive: true },
        select: { id: true },
      })
    : [];
  const mentionedIds = mentioned.map((user) => user.id);
  const assigneeIds = task.assignees.map((assignee) => assignee.userId);
  const excerpt = bodyRes.value.replace(/\s+/g, " ").slice(0, 160);

  await notifyUsers({
    audience: mentionedIds,
    kind: "task_mention",
    title: `${me.name} mentioned you`,
    body: `${task.title}: ${excerpt}`,
    href: `/tasks#task-${task.id}`,
    excludeUserId: me.id,
  });
  await notifyUsers({
    audience: assigneeIds.filter((id) => !mentionedIds.includes(id)),
    kind: "task_comment",
    title: `New comment on ${task.title}`,
    body: `${me.name}: ${excerpt}`,
    href: `/tasks#task-${task.id}`,
    excludeUserId: me.id,
  });

  refresh();
  return { ok: true };
}
