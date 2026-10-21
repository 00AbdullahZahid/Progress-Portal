"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireAdmin } from "../auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Project name is required." };
  await db.project.create({ data: { name: name.slice(0, 120) } });
  refresh();
  return { ok: true };
}

export async function createGoal(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) return { ok: false, error: "Goal title is required." };
  const target = String(formData.get("targetDate") ?? "");
  await db.goal.create({
    data: {
      projectId,
      title: title.slice(0, 160),
      targetDate: target ? new Date(target) : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const goalId = String(formData.get("goalId") ?? "") || null;
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const priority = String(formData.get("priority") ?? "med");
  const due = String(formData.get("dueDate") ?? "");
  if (!projectId || !title) return { ok: false, error: "Task title is required." };
  await db.task.create({
    data: {
      projectId,
      title: title.slice(0, 160),
      goalId,
      assigneeId,
      priority,
      dueDate: due ? new Date(due) : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function cycleTaskStatus(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };
  const next =
    task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
  await db.task.update({
    where: { id: taskId },
    data: {
      status: next,
      completedAt: next === "done" ? new Date() : null,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { ok: false, error: "Task not found." };
  await db.task.delete({ where: { id: taskId } }).catch(() => {});
  refresh();
  return { ok: true };
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { ok: false, error: "Goal not found." };
  // Detach tasks from the goal first so they aren't lost, then delete the goal.
  await db.task.updateMany({ where: { goalId }, data: { goalId: null } });
  await db.goal.delete({ where: { id: goalId } }).catch(() => {});
  refresh();
  return { ok: true };
}

export async function deleteProject(formData: FormData): Promise<ActionResult> {
  "use server";
  await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false, error: "Project not found." };
  // Cascades to goals, tasks, comments, and channels via the schema.
  await db.project.delete({ where: { id: projectId } }).catch(() => {});
  refresh();
  revalidatePath("/chat");
  return { ok: true };
}

export async function addComment(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!taskId || !body) return { ok: false, error: "Comment cannot be empty." };
  await db.taskComment.create({
    data: { taskId, authorId: me.id, body: body.slice(0, 2000) },
  });
  refresh();
  return { ok: true };
}
