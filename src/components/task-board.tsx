"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProject,
  createGoal,
  createTask,
  cycleTaskStatus,
  deleteTask,
  deleteGoal,
  deleteProject,
  addComment,
  type ActionResult,
} from "@/lib/actions/tasks";
import { Card, Button, Input, Select, Badge, EmptyState } from "./ui";
import { Avatar } from "./avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import {
  TasksIcon,
  TargetIcon,
  ChatIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  TrashIcon,
  CircleDot,
} from "./icons";

type Member = { id: string; name: string; color: string };
type Comment = { id: string; body: string; author: Member; createdAt: string };
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: Member | null;
  goal: { id: string; title: string } | null;
  comments: Comment[];
};
type Goal = { id: string; title: string; targetDate: string | null };
type Project = { id: string; name: string; goals: Goal[]; tasks: Task[] };

const statusMeta: Record<string, { label: string; dot: string }> = {
  todo: { label: "To do", dot: "bg-muted" },
  doing: { label: "In progress", dot: "bg-amber-500" },
  done: { label: "Done", dot: "bg-emerald-500" },
};

export function TaskBoard({
  projects,
  members,
  isAdmin,
}: {
  projects: Project[];
  members: Member[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    run: (fd: FormData) => Promise<ActionResult>;
    data: FormData;
    success: string;
  } | null>(null);

  function act(
    fn: (fd: FormData) => Promise<ActionResult>,
    success: string
  ) {
    return async (fd: FormData) => {
      try {
        const res = await fn(fd);
        if (!res.ok) {
          toast(res.error, "error");
          return;
        }
        toast(success, "success");
        router.refresh();
      } catch {
        toast("Something went wrong. Please try again.", "error");
      }
    };
  }

  /** Deletes go through a confirmation modal instead of window.confirm. */
  function askDelete(opts: {
    title: string;
    body: string;
    confirmLabel: string;
    run: (fd: FormData) => Promise<ActionResult>;
    data: FormData;
    success: string;
  }) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setConfirm(opts);
    };
  }

  async function confirmRun() {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    try {
      const res = await c.run(c.data);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(c.success, "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {isAdmin ? (
        <Card className="p-4">
          <form action={act(createProject, "Project created")} className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <PlusIcon width={16} height={16} className="text-brand" />
              New project
            </span>
            <Input name="name" placeholder="Project name" className="min-w-40 flex-1" required />
            <Button type="submit">Add</Button>
          </form>
        </Card>
      ) : (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-xs text-muted">
          Only the super admin can add projects, goals, and tasks. You can update statuses and
          comment.
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<TasksIcon />}
          title="No projects yet"
          hint={isAdmin ? "Create your first project above to start tracking tasks." : undefined}
        />
      ) : null}

      {projects.map((project) => (
        <Card key={project.id} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <TasksIcon width={18} height={18} className="text-brand" />
              {project.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                {project.tasks.filter((t) => t.status === "done").length}/
                {project.tasks.length} done
              </span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{
                    width: `${
                      project.tasks.length
                        ? (project.tasks.filter((t) => t.status === "done").length /
                            project.tasks.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              {isAdmin ? (
                <form
                  onSubmit={askDelete({
                    title: `Delete project "${project.name}"?`,
                    body: "This permanently removes its goals, tasks, and comments. This cannot be undone.",
                    confirmLabel: "Delete project",
                    run: deleteProject,
                    data: (() => {
                      const fd = new FormData();
                      fd.set("projectId", project.id);
                      return fd;
                    })(),
                    success: "Project deleted",
                  })}
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <button
                    type="submit"
                    title="Delete project"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {/* Goals */}
          <div className="mb-4 flex flex-col gap-2">
            {project.goals.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm"
              >
                <TargetIcon width={16} height={16} className="text-brand" />
                <span className="flex-1 font-medium">{g.title}</span>
                {g.targetDate ? (
                  <span className="text-xs text-muted">
                    due {new Date(g.targetDate).toLocaleDateString()}
                  </span>
                ) : null}
                {isAdmin ? (
                  <form
                    onSubmit={askDelete({
                      title: `Delete goal "${g.title}"?`,
                      body: "Tasks linked to this goal stay, but will be unlinked from it.",
                      confirmLabel: "Delete goal",
                      run: deleteGoal,
                      data: (() => {
                        const fd = new FormData();
                        fd.set("goalId", g.id);
                        return fd;
                      })(),
                      success: "Goal deleted",
                    })}
                  >
                    <input type="hidden" name="goalId" value={g.id} />
                    <button
                      type="submit"
                      title="Delete goal"
                      className="rounded-md p-1 text-muted transition-colors hover:bg-surface/60 hover:text-rose-600"
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            {isAdmin ? (
              <form action={act(createGoal, "Goal added")} className="flex flex-wrap gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <Input name="title" placeholder="Add a goal…" className="min-w-40 flex-1" />
                <Input type="date" name="targetDate" className="w-40" />
                <Button type="submit" variant="outline">
                  <PlusIcon width={16} height={16} />
                  Goal
                </Button>
              </form>
            ) : null}
          </div>

          {/* New task (admin only) */}
          {isAdmin ? (
            <form
              action={act(createTask, "Task created")}
              className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-3"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <Input name="title" placeholder="Add a task…" className="min-w-40 flex-1" required />
              <Select name="goalId" className="w-44">
                <option value="">(no goal)</option>
                {project.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title.slice(0, 24)}
                  </option>
                ))}
              </Select>
              <Select name="assigneeId" className="w-32">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Select name="priority" className="w-24">
                <option value="low">Low</option>
                <option value="med" defaultValue="med">
                  Med
                </option>
                <option value="high">High</option>
              </Select>
              <Input type="date" name="dueDate" className="w-38" />
              <Button type="submit">Add</Button>
            </form>
          ) : null}

          {/* Task columns */}
          <div className="grid gap-4 md:grid-cols-3">
            {(["todo", "doing", "done"] as const).map((status) => {
              const list = project.tasks.filter((t) => t.status === status);
              return (
                <div key={status} className="flex flex-col gap-2">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <span className={`h-2 w-2 rounded-full ${statusMeta[status].dot}`} />
                    {statusMeta[status].label} ({list.length})
                  </p>
                  {list.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                      Nothing here
                    </p>
                  ) : null}
                  {list.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border bg-surface2/50 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <form action={act(cycleTaskStatus, "Task updated")}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            title="Move to next stage"
                            className={`mt-0.5 transition-transform hover:scale-110 ${
                              task.status === "done" ? "text-emerald-500" : "text-muted"
                            }`}
                          >
                            {task.status === "done" ? (
                              <CheckIcon width={18} height={18} />
                            ) : (
                              <CircleDot
                                width={18}
                                height={18}
                                className={
                                  task.status === "doing" ? "text-amber-500" : "text-muted"
                                }
                              />
                            )}
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              task.status === "done" ? "text-muted line-through" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge kind={task.priority} />
                            {task.goal ? (
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                                {task.goal.title.slice(0, 18)}
                              </span>
                            ) : null}
                            {task.dueDate ? (
                              <span className="text-[11px] text-muted">
                                due {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {task.assignee ? (
                                <Avatar user={task.assignee} size="sm" />
                              ) : (
                                <span className="text-[11px] text-muted">unassigned</span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenComments((o) => ({ ...o, [task.id]: !o[task.id] }))
                                }
                                className="flex items-center gap-1 text-xs text-muted hover:text-ink"
                              >
                                <ChatIcon width={14} height={14} />
                                {task.comments.length}
                              </button>
                            </div>
                            {isAdmin ? (
                              <form
                                onSubmit={askDelete({
                                  title: "Delete this task?",
                                  body: `"${task.title}" and its comments will be permanently removed.`,
                                  confirmLabel: "Delete task",
                                  run: deleteTask,
                                  data: (() => {
                                    const fd = new FormData();
                                    fd.set("taskId", task.id);
                                    return fd;
                                  })(),
                                  success: "Task deleted",
                                })}
                              >
                                <input type="hidden" name="taskId" value={task.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-muted hover:text-rose-600"
                                  title="Delete task"
                                >
                                  <XIcon width={16} height={16} />
                                </button>
                              </form>
                            ) : null}
                          </div>

                          {openComments[task.id] ? (
                            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
                              {task.comments.map((c) => (
                                <div key={c.id} className="flex items-start gap-1.5">
                                  <Avatar user={c.author} size="sm" />
                                  <p className="text-xs">
                                    <span className="font-semibold">{c.author.name}</span>{" "}
                                    {c.body}
                                  </p>
                                </div>
                              ))}
                              <form
                                action={act(addComment, "Comment added")}
                                className="flex items-center gap-1.5"
                              >
                                <input type="hidden" name="taskId" value={task.id} />
                                <Input name="body" placeholder="Write a comment…" className="text-xs" required />
                                <Button type="submit" variant="outline" className="px-2.5 py-1.5 text-xs">
                                  Send
                                </Button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirmRun}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
