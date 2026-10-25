"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProject,
  createGoal,
  createTask,
  setTaskStatus,
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
  TrashIcon,
} from "./icons";

type Member = { id: string; name: string; color: string; image?: string | null };
type Comment = { id: string; body: string; author: Member; createdAt: string };
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignees: Member[];
  goal: { id: string; title: string } | null;
  studyMinutes: number;
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
  meId,
}: {
  projects: Project[];
  members: Member[];
  isAdmin: boolean;
  meId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState(projects[0]?.id ?? "");
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

  const selectedTaskProject =
    projects.find((project) => project.id === taskProjectId) ?? projects[0];

  return (
    <div className="flex flex-col gap-6">
      {isAdmin ? (
        <Card className="p-4">
          <form
            action={act(createProject, "Project created")}
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <PlusIcon width={16} height={16} className="text-brand" />
              New project
            </span>
            <Input
              name="name"
              placeholder="Project name"
              className="min-w-0 flex-1 sm:min-w-40"
              required
            />
            <Button type="submit" className="w-full sm:w-auto">
              Add
            </Button>
          </form>
        </Card>
      ) : (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-xs text-muted">
          Only the super admin can add projects, goals, and tasks. Assigned members can move
          their own tasks; everyone can comment.
        </p>
      )}

      {isAdmin ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 font-semibold">
                <TasksIcon width={18} height={18} className="text-brand" />
                New task
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Add a task to any project and assign it to one or more members.
              </p>
            </div>
            <Button
              type="button"
              variant={showTaskForm ? "outline" : "primary"}
              className="w-full sm:w-auto"
              onClick={() => setShowTaskForm((open) => !open)}
            >
              <PlusIcon width={16} height={16} />
              {showTaskForm ? "Close" : "Add task"}
            </Button>
          </div>

          {showTaskForm ? (
            projects.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                Create a project first, then add tasks here.
              </p>
            ) : (
              <form
                action={act(createTask, "Task created")}
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <label className="block sm:col-span-2 lg:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-muted">Task title</span>
                  <Input name="title" placeholder="What needs to be done?" maxLength={160} required />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Project</span>
                  <Select
                    name="projectId"
                    value={selectedTaskProject?.id ?? ""}
                    onChange={(e) => setTaskProjectId(e.target.value)}
                    required
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Goal</span>
                  <Select
                    key={selectedTaskProject?.id ?? "no-project"}
                    name="goalId"
                    defaultValue=""
                  >
                    <option value="">(no goal)</option>
                    {selectedTaskProject?.goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Priority</span>
                  <Select name="priority" defaultValue="med">
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Due date</span>
                  <Input type="date" name="dueDate" />
                </label>

                <fieldset className="min-w-0 sm:col-span-2 lg:col-span-4">
                  <legend className="mb-1 text-xs font-medium text-muted">Assign to</legend>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted">No members yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((member) => (
                        <label
                          key={member.id}
                          className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft/50"
                        >
                          <input
                            type="checkbox"
                            name="assigneeIds"
                            value={member.id}
                            className="shrink-0 rounded border-border"
                          />
                          <Avatar user={member} size="sm" />
                          <span className="truncate">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    Choose as many people as you need, or leave everyone unchecked for an
                    unassigned task.
                  </p>
                </fieldset>

                <div className="sm:col-span-2 lg:col-span-4">
                  <Button type="submit" className="w-full sm:w-auto">
                    <PlusIcon width={16} height={16} />
                    Add task
                  </Button>
                </div>
              </form>
            )
          ) : null}
        </Card>
      ) : null}

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
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
              <TasksIcon width={18} height={18} className="shrink-0 text-brand" />
              <span className="break-words">{project.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
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
                    aria-label={`Delete project ${project.name}`}
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
                      aria-label={`Delete goal ${g.title}`}
                      className="rounded-md p-1 text-muted transition-colors hover:bg-surface/60 hover:text-rose-600"
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            {isAdmin ? (
              <form
                action={act(createGoal, "Goal added")}
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <Input
                  name="title"
                  placeholder="Add a goal…"
                  className="min-w-0 flex-1 sm:min-w-40"
                />
                <Input type="date" name="targetDate" className="w-full sm:w-40" />
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  <PlusIcon width={16} height={16} />
                  Goal
                </Button>
              </form>
            ) : null}
          </div>

          {/* Flat task list (no status columns) */}
          <div className="flex flex-col gap-2">
            {project.tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                No tasks yet
              </p>
            ) : null}
            {project.tasks.map((task) => {
              const canMove =
                isAdmin || task.assignees.some((assignee) => assignee.id === meId);
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-surface2/50 p-3"
                >
                  <div className="flex items-start gap-3">
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
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            task.status === "done"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : task.status === "doing"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-surface2 text-muted"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[task.status]?.dot ?? "bg-muted"}`} />
                          {statusMeta[task.status]?.label ?? task.status}
                        </span>
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
                        {task.studyMinutes > 0 ? (
                          <span
                            className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted"
                            title={`${task.studyMinutes} minutes of linked focus time`}
                          >
                            {task.studyMinutes >= 60
                              ? `${Math.round(task.studyMinutes / 6) / 10}h`
                              : `${task.studyMinutes}m`}{" "}
                            focus
                          </span>
                        ) : null}
                      </div>

                      {/* Explicit status buttons — no more cycling. */}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {(["todo", "doing", "done"] as const).map((s) => (
                          <form key={s} action={act(setTaskStatus, "Task updated")}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="status" value={s} />
                            <button
                              type="submit"
                              disabled={!canMove || task.status === s}
                              aria-label={`Mark as ${statusMeta[s].label}`}
                              aria-pressed={task.status === s}
                              title={
                                canMove
                                  ? `Mark as ${statusMeta[s].label}`
                                  : "Only an assignee or an admin can change this"
                              }
                              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                task.status === s
                                  ? "bg-brand text-white"
                                  : canMove
                                    ? "text-muted hover:bg-surface2 hover:text-ink"
                                    : "cursor-not-allowed text-muted/50"
                              }`}
                            >
                              {statusMeta[s].label}
                            </button>
                          </form>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {task.assignees.length > 0 ? (
                            <>
                              <div className="flex shrink-0 -space-x-1.5">
                                {task.assignees.slice(0, 4).map((assignee) => (
                                  <span
                                    key={assignee.id}
                                    className="rounded-full ring-2 ring-surface"
                                  >
                                    <Avatar user={assignee} size="sm" />
                                  </span>
                                ))}
                                {task.assignees.length > 4 ? (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface2 text-[10px] font-semibold text-muted ring-2 ring-surface">
                                    +{task.assignees.length - 4}
                                  </span>
                                ) : null}
                              </div>
                              <span className="min-w-0 truncate text-[11px] text-muted">
                                {task.assignees.map((assignee) => assignee.name).join(", ")}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted">unassigned</span>
                          )}
                          <button
                            type="button"
                            aria-expanded={Boolean(openComments[task.id])}
                            aria-label={`Comments (${task.comments.length})`}
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
                              aria-label="Delete task"
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
                              <p className="min-w-0 break-words text-xs">
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
                            <Input
                              name="body"
                              aria-label="Write a comment"
                              placeholder="Write a comment…"
                              className="text-xs"
                              required
                            />
                            <Button type="submit" variant="outline" className="px-2.5 py-1.5 text-xs">
                              Send
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
