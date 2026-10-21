"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireAdmin } from "../auth";
import { cleanText } from "../validation";
import { audit } from "../audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PRIORITIES = ["low", "med", "high"] as const;
const STATUSES = ["todo", "doing", "done"] as const;

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

function parseDate(value: unknown): Date | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
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
  const me = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const titleRes = cleanText(formData.get("title"), 160);
  if (!titleRes.ok) return titleRes;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, error: "Project not found." };

  // The goal, if given, must belong to the same project.
  const goalId = String(formData.get("goalId") ?? "") || null;
  if (goalId) {
    const goal = await db.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.projectId !== projectId)
      return { ok: false, error: "That goal doesn't belong to this project." };
  }

  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (assigneeId) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) return { ok: false, error: "Assignee not found." };
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
      assigneeId,
      priority: priority as (typeof PRIORITIES)[number],
      dueDate: due,
    },
  });
  await audit(me.id, "task.create", { targetId: task.id, detail: task.title });

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

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };

  if (me.role !== "admin" && task.assigneeId !== me.id) {
    return {
      ok: false,
      error: "You can only update tasks assigned to you.",
    };
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      status: status as (typeof STATUSES)[number],
      completedAt: status === "done" ? new Date() : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { ok: false, error: "Task not found." };
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };
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

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };

  await db.taskComment.create({
    data: { taskId, authorId: me.id, body: bodyRes.value },
  });
  refresh();
  return { ok: true };
}
