"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireAdmin } from "../auth";

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createProject(formData: FormData) {
  "use server";
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.project.create({ data: { name } });
  refresh();
}

export async function createGoal(formData: FormData) {
  "use server";
  await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) return;
  const target = String(formData.get("targetDate") ?? "");
  await db.goal.create({
    data: {
      projectId,
      title,
      targetDate: target ? new Date(target) : null,
    },
  });
  refresh();
}

export async function createTask(formData: FormData) {
  "use server";
  await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const goalId = String(formData.get("goalId") ?? "") || null;
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const priority = String(formData.get("priority") ?? "med");
  const due = String(formData.get("dueDate") ?? "");
  if (!projectId || !title) return;
  await db.task.create({
    data: {
      projectId,
      title,
      goalId,
      assigneeId,
      priority,
      dueDate: due ? new Date(due) : null,
    },
  });
  refresh();
}

export async function cycleTaskStatus(formData: FormData) {
  "use server";
  await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;
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
}

export async function deleteTask(formData: FormData) {
  "use server";
  await requireAdmin();
  const taskId = String(formData.get("taskId") ?? "");
  await db.task.delete({ where: { id: taskId } }).catch(() => {});
  refresh();
}

export async function addComment(formData: FormData) {
  "use server";
  const me = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!taskId || !body) return;
  await db.taskComment.create({
    data: { taskId, authorId: me.id, body: body.slice(0, 2000) },
  });
  refresh();
}
