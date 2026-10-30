"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSubject,
  updateSubject,
  deleteSubject,
  createProject,
  updateProject,
  deleteProject,
  createTask,
  updateTask,
  setTaskStatus,
  deleteTask,
  addComment,
  type ActionResult,
} from "@/lib/actions/tasks";
import { Card, Button, Input, Select, Badge, EmptyState } from "./ui";
import { Avatar } from "./avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog } from "./dialog";
import { useToast } from "./toast";
import {
  TasksIcon,
  FolderIcon,
  ChatIcon,
  PlusIcon,
  XIcon,
  TrashIcon,
  EditIcon,
  ChevronDownIcon,
} from "./icons";

type Member = { id: string; name: string; color: string; image?: string | null };
type Comment = { id: string; body: string; author: Member; createdAt: string };
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  subjectId: string | null;
  projectId: string | null;
  createdById: string | null;
  assignees: Member[];
  subject: { id: string; name: string; color: string } | null;
  project: { id: string; title: string } | null;
  studyMinutes: number;
  comments: Comment[];
};
type Project = { id: string; title: string; targetDate: string | null };
type Subject = {
  id: string;
  name: string;
  color: string;
  archivedAt: string | null;
  projects: Project[];
  tasks: Task[];
};

const statusMeta: Record<string, { label: string; dot: string }> = {
  todo: { label: "To do", dot: "bg-muted" },
  doing: { label: "In progress", dot: "bg-amber-500" },
  done: { label: "Done", dot: "bg-emerald-500" },
};

const DUE_GROUPS = [
  "Overdue",
  "Today",
  "Tomorrow",
  "This week",
  "Later",
  "No due date",
] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function addDays(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day + days));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dueMeta(iso: string | null) {
  if (!iso) return null;
  const key = iso.slice(0, 10);
  const today = dateKey(new Date());
  const overdue = key < today;
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const label =
    key === today
      ? "Today"
      : key === tomorrow
        ? "Tomorrow"
        : key === yesterday
          ? "Yesterday"
          : formatDate(iso);
  const tone = overdue
    ? "text-rose-600 dark:text-rose-400"
    : key === today || key === tomorrow
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted";
  return { label, tone, overdue };
}

function dueBucket(iso: string | null) {
  if (!iso) return "No due date";
  const key = iso.slice(0, 10);
  const today = dateKey(new Date());
  if (key < today) return "Overdue";
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key <= addDays(today, 7)) return "This week";
  return "Later";
}

function Progress({
  done,
  total,
  color = "#2563eb",
}: {
  done: number;
  total: number;
  color?: string;
}) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="h-1.5 w-24 overflow-hidden rounded-full bg-surface2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} done`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-xl bg-surface2/70 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
            value === option.value
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TaskFields({
  subjects,
  members,
  subjectId,
  projectId,
  onSubjectChange,
  onProjectChange,
  defaultTitle = "",
  defaultPriority = "med",
  defaultDue = "",
  assignedIds = [],
  autoFocus = false,
}: {
  subjects: Subject[];
  members: Member[];
  subjectId: string;
  projectId: string;
  onSubjectChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  defaultTitle?: string;
  defaultPriority?: string;
  defaultDue?: string;
  assignedIds?: string[];
  autoFocus?: boolean;
}) {
  const subject = subjects.find((item) => item.id === subjectId) ?? null;
  const projects = subject?.projects ?? [];

  return (
    <>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-muted">Task title</span>
        <Input
          name="title"
          data-autofocus={autoFocus ? true : undefined}
          defaultValue={defaultTitle}
          placeholder="What needs to be done?"
          maxLength={160}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
        <Select
          name="subjectId"
          value={subjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
        >
          <option value="">No subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.archivedAt ? " (archived)" : ""}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Project</span>
        <Select
          name="projectId"
          value={projectId}
          onChange={(event) => onProjectChange(event.target.value)}
          disabled={!subject}
        >
          <option value="">
            {subject ? "No project (direct task)" : "Choose a subject first"}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </Select>
        <span className="mt-1 block text-[11px] text-muted">
          A task can sit directly under a subject or inside one of its projects.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Priority</span>
        <Select name="priority" defaultValue={defaultPriority}>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </Select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Due date</span>
        <Input type="date" name="dueDate" defaultValue={defaultDue} />
      </label>

      <fieldset className="min-w-0 sm:col-span-2">
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
                  defaultChecked={assignedIds.includes(member.id)}
                  className="shrink-0 rounded border-border"
                />
                <Avatar user={member} size="sm" />
                <span className="truncate">{member.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}

export function TaskBoard({
  subjects,
  standaloneTasks,
  members,
  isAdmin,
  meId,
}: {
  subjects: Subject[];
  standaloneTasks: Task[];
  members: Member[];
  isAdmin: boolean;
  meId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [scope, setScope] = useState<"mine" | "everyone">("mine");
  const [view, setView] = useState<"subjects" | "due">("subjects");

  const [addOpen, setAddOpen] = useState(false);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addProjectId, setAddProjectId] = useState("");

  const [editing, setEditing] = useState<Task | null>(null);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");

  const [subjectDialog, setSubjectDialog] = useState<
    { mode: "create" } | { mode: "edit"; subject: Subject } | null
  >(null);
  const [projectDialog, setProjectDialog] = useState<
    | { mode: "create"; subjectId: string }
    | { mode: "edit"; subjectId: string; project: Project }
    | null
  >(null);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    run: (fd: FormData) => Promise<ActionResult>;
    data: FormData;
    success: string;
  } | null>(null);

  async function run(
    fn: (fd: FormData) => Promise<ActionResult>,
    fd: FormData,
    success: string
  ) {
    try {
      const res = await fn(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return false;
      }
      toast(success, "success");
      router.refresh();
      return true;
    } catch {
      toast("Something went wrong. Please try again.", "error");
      return false;
    }
  }

  function act(fn: (fd: FormData) => Promise<ActionResult>, success: string) {
    return async (fd: FormData) => {
      await run(fn, fd, success);
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
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setConfirm(opts);
    };
  }

  async function confirmRun() {
    if (!confirm) return;
    const current = confirm;
    setConfirm(null);
    await run(current.run, current.data, current.success);
  }

  function openAddTask() {
    setAddSubjectId(subjects[0]?.id ?? "");
    setAddProjectId("");
    setAddOpen(true);
  }

  function changeAddSubject(value: string) {
    setAddSubjectId(value);
    const next = subjects.find((subject) => subject.id === value);
    if (!next?.projects.some((project) => project.id === addProjectId)) {
      setAddProjectId("");
    }
  }

  function changeAddProject(value: string) {
    setAddProjectId(value);
    if (!value) return;
    for (const subject of subjects) {
      if (subject.projects.some((project) => project.id === value)) {
        setAddSubjectId(subject.id);
        return;
      }
    }
  }

  function openEditTask(task: Task) {
    setEditSubjectId(task.subjectId ?? task.subject?.id ?? "");
    setEditProjectId(task.projectId ?? "");
    setEditing(task);
  }

  function changeEditSubject(value: string) {
    setEditSubjectId(value);
    const next = subjects.find((subject) => subject.id === value);
    if (!next?.projects.some((project) => project.id === editProjectId)) {
      setEditProjectId("");
    }
  }

  function changeEditProject(value: string) {
    setEditProjectId(value);
    if (!value) return;
    for (const subject of subjects) {
      if (subject.projects.some((project) => project.id === value)) {
        setEditSubjectId(subject.id);
        return;
      }
    }
  }

  async function saveEdit(fd: FormData) {
    if (!editing) return;
    fd.set("taskId", editing.id);
    const ok = await run(updateTask, fd, "Task updated");
    if (ok) setEditing(null);
  }

  async function saveSubject(fd: FormData) {
    const editingSubject = subjectDialog?.mode === "edit" ? subjectDialog.subject : null;
    if (editingSubject) fd.set("subjectId", editingSubject.id);
    const ok = await run(
      editingSubject ? updateSubject : createSubject,
      fd,
      editingSubject ? "Subject updated" : "Subject created"
    );
    if (ok) setSubjectDialog(null);
  }

  async function saveProject(fd: FormData) {
    if (!projectDialog) return;
    fd.set("subjectId", projectDialog.subjectId);
    const editingProject = projectDialog.mode === "edit" ? projectDialog.project : null;
    if (editingProject) fd.set("projectId", editingProject.id);
    const ok = await run(
      editingProject ? updateProject : createProject,
      fd,
      editingProject ? "Project updated" : "Project added"
    );
    if (ok) setProjectDialog(null);
  }

  const matchesScope = (task: Task) =>
    scope === "everyone" ||
    task.assignees.some((assignee) => assignee.id === meId) ||
    task.createdById === meId;

  const visibleStandalone = standaloneTasks.filter(matchesScope);

  const dueItems = [
    ...subjects.flatMap((subject) => subject.tasks),
    ...standaloneTasks,
  ]
    .filter(matchesScope)
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const dueGroups = DUE_GROUPS.map((group) => ({
    group,
    items: dueItems.filter((task) => dueBucket(task.dueDate) === group),
  })).filter((bucket) => bucket.items.length > 0);

  const nothingToShow =
    view === "due"
      ? dueItems.length === 0
      : visibleStandalone.length === 0 &&
        subjects.every((subject) => subject.tasks.filter(matchesScope).length === 0);

  function renderTask(task: Task, showContext = false) {
    const canMove =
      isAdmin || task.assignees.some((assignee) => assignee.id === meId);
    // Legacy tasks predate creator tracking, so anyone may edit them;
    // deleting those stays admin-only.
    const canEdit =
      isAdmin || task.createdById === meId || task.createdById === null;
    const canDelete = isAdmin || task.createdById === meId;
    const due = dueMeta(task.dueDate);

    return (
      <div
        key={task.id}
        id={`task-${task.id}`}
        className="scroll-mt-24 rounded-xl border border-border bg-surface p-3"
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
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    statusMeta[task.status]?.dot ?? "bg-muted"
                  }`}
                />
                {statusMeta[task.status]?.label ?? task.status}
              </span>
              {showContext && task.subject ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: task.subject.color }}
                  />
                  {task.subject.name}
                </span>
              ) : null}
              {showContext && task.project ? (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                  {task.project.title}
                </span>
              ) : null}
              {due ? (
                <span className={`text-[11px] ${due.tone}`}>
                  due {due.label}
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
              {(["todo", "doing", "done"] as const).map((status) => (
                <form key={status} action={act(setTaskStatus, "Task updated")}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="status" value={status} />
                  <button
                    type="submit"
                    disabled={!canMove || task.status === status}
                    aria-label={`Mark as ${statusMeta[status].label}`}
                    aria-pressed={task.status === status}
                    title={
                      canMove
                        ? `Mark as ${statusMeta[status].label}`
                        : "Only an assignee or an admin can change this"
                    }
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      task.status === status
                        ? "bg-brand text-brand-ink"
                        : canMove
                          ? "text-muted hover:bg-surface2 hover:text-ink"
                          : "cursor-not-allowed text-muted/50"
                    }`}
                  >
                    {statusMeta[status].label}
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
                    setOpenComments((current) => ({
                      ...current,
                      [task.id]: !current[task.id],
                    }))
                  }
                  className="flex items-center gap-1 text-xs text-muted hover:text-ink"
                >
                  <ChatIcon width={14} height={14} />
                  {task.comments.length}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => openEditTask(task)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    title="Edit task"
                    aria-label={`Edit ${task.title}`}
                  >
                    <EditIcon width={16} height={16} />
                  </button>
                ) : null}
                {canDelete ? (
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
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <XIcon width={16} height={16} />
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            {openComments[task.id] ? (
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-1.5">
                    <Avatar user={comment.author} size="sm" />
                    <p className="min-w-0 break-words text-xs">
                      <span className="font-semibold">{comment.author.name}</span>{" "}
                      {comment.body}
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
                  <Button
                    type="submit"
                    variant="outline"
                    className="px-2.5 py-1.5 text-xs"
                  >
                    Send
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Whose tasks"
              value={scope}
              onChange={(value) => setScope(value as "mine" | "everyone")}
              options={[
                { value: "mine", label: "Mine" },
                { value: "everyone", label: "Everyone" },
              ]}
            />
            <Segmented
              label="Task view"
              value={view}
              onChange={(value) => setView(value as "subjects" | "due")}
              options={[
                { value: "subjects", label: "Subjects" },
                { value: "due", label: "By due date" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={openAddTask}
              className="w-full sm:w-auto"
            >
              <PlusIcon width={16} height={16} />
              Add task
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectDialog({ mode: "create" })}
                className="w-full sm:w-auto"
              >
                <PlusIcon width={16} height={16} />
                Subject
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {scope === "mine"
            ? "Showing tasks assigned to you or created by you."
            : "Showing every task in the group."}{" "}
          Tasks can live directly under a subject or inside one of its projects.
        </p>
      </Card>

      {view === "subjects" ? (
        <>
          {subjects.map((subject) => {
            const subjectTasks = subject.tasks.filter(matchesScope);
            const directTasks = subjectTasks.filter((task) => !task.projectId);
            const done = subjectTasks.filter((task) => task.status === "done").length;
            const open = subjectTasks.length - done;
            const nextDue =
              subjectTasks
                .filter((task) => task.status !== "done" && task.dueDate)
                .map((task) => task.dueDate as string)
                .sort()[0] ?? null;
            const focus = subjectTasks.reduce(
              (sum, task) => sum + task.studyMinutes,
              0
            );

            return (
              <Card key={subject.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className="mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-surface"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                        <span className="break-words">{subject.name}</span>
                        {subject.archivedAt ? (
                          <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] text-muted">
                            Archived
                          </span>
                        ) : null}
                      </h2>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>
                          {subject.projects.length} project
                          {subject.projects.length === 1 ? "" : "s"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {open} open task{open === 1 ? "" : "s"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {done}/{subjectTasks.length} done
                        </span>
                        {nextDue ? (
                          <>
                            <span aria-hidden>·</span>
                            <span>next due {formatDate(nextDue)}</span>
                          </>
                        ) : null}
                        {focus > 0 ? (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              {focus >= 60
                                ? `${Math.round(focus / 6) / 10}h`
                                : `${focus}m`}{" "}
                              focus
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Progress
                      done={done}
                      total={subjectTasks.length}
                      color={subject.color}
                    />
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSubjectDialog({ mode: "edit", subject })
                          }
                          title="Edit subject"
                          aria-label={`Edit subject ${subject.name}`}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <form
                          onSubmit={askDelete({
                            title: `Delete subject "${subject.name}"?`,
                            body: "This permanently removes its projects, tasks, comments, and chat channel. This cannot be undone.",
                            confirmLabel: "Delete subject",
                            run: deleteSubject,
                            data: (() => {
                              const fd = new FormData();
                              fd.set("subjectId", subject.id);
                              return fd;
                            })(),
                            success: "Subject deleted",
                          })}
                        >
                          <input
                            type="hidden"
                            name="subjectId"
                            value={subject.id}
                          />
                          <button
                            type="submit"
                            title="Delete subject"
                            aria-label={`Delete subject ${subject.name}`}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                          >
                            <TrashIcon width={16} height={16} />
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {subject.projects.map((project) => {
                    const tasks = subjectTasks.filter(
                      (task) => task.projectId === project.id
                    );
                    const projectDone = tasks.filter(
                      (task) => task.status === "done"
                    ).length;
                    const isOpen = !collapsed[project.id];

                    return (
                      <div
                        key={project.id}
                        className="rounded-xl border border-border bg-surface2/40"
                      >
                        <div className="flex items-center gap-2 px-2.5 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsed((current) => ({
                                ...current,
                                [project.id]: !current[project.id],
                              }))
                            }
                            aria-expanded={isOpen}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <ChevronDownIcon
                              width={16}
                              height={16}
                              className={`shrink-0 text-muted transition-transform ${
                                isOpen ? "" : "-rotate-90"
                              }`}
                            />
                            <FolderIcon
                              width={16}
                              height={16}
                              className="shrink-0 text-brand"
                            />
                            <span className="min-w-0 truncate text-sm font-medium">
                              {project.title}
                            </span>
                            {project.targetDate ? (
                              <span className="hidden shrink-0 text-[11px] text-muted sm:inline">
                                target {formatDate(project.targetDate)}
                              </span>
                            ) : null}
                          </button>
                          <span className="shrink-0 text-[11px] text-muted">
                            {projectDone}/{tasks.length}
                          </span>
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setProjectDialog({
                                    mode: "edit",
                                    subjectId: subject.id,
                                    project,
                                  })
                                }
                                title="Edit project"
                                aria-label={`Edit project ${project.title}`}
                                className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
                              >
                                <EditIcon width={14} height={14} />
                              </button>
                              <form
                                onSubmit={askDelete({
                                  title: `Delete project "${project.title}"?`,
                                  body: "Tasks in this project stay under the subject and are only unlinked from the project.",
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
                                <input
                                  type="hidden"
                                  name="projectId"
                                  value={project.id}
                                />
                                <button
                                  type="submit"
                                  title="Delete project"
                                  aria-label={`Delete project ${project.title}`}
                                  className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-rose-600"
                                >
                                  <XIcon width={14} height={14} />
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>

                        {isOpen ? (
                          <div className="flex flex-col gap-2 border-t border-border px-2.5 py-2.5">
                            {tasks.length === 0 ? (
                              <p className="rounded-lg border border-dashed border-border p-2 text-center text-xs text-muted">
                                No tasks in this project yet
                              </p>
                            ) : (
                              tasks.map((task) => renderTask(task))
                            )}
                            <form
                              action={act(createTask, "Task added")}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="hidden"
                                name="subjectId"
                                value={subject.id}
                              />
                              <input
                                type="hidden"
                                name="projectId"
                                value={project.id}
                              />
                              <Input
                                name="title"
                                aria-label={`Add a task to ${project.title}`}
                                placeholder={`Add a task to ${project.title}…`}
                                className="text-sm"
                                required
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                className="shrink-0 px-3"
                                aria-label="Add task"
                              >
                                <PlusIcon width={16} height={16} />
                              </Button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() =>
                        setProjectDialog({
                          mode: "create",
                          subjectId: subject.id,
                        })
                      }
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm text-muted transition-colors hover:border-brand/40 hover:text-ink"
                    >
                      <PlusIcon width={16} height={16} />
                      Add project
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Subject tasks
                  </h3>
                  {directTasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                      No tasks directly under this subject
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {directTasks.map((task) => renderTask(task))}
                    </div>
                  )}
                </div>

                <form
                  action={act(createTask, "Task added")}
                  className="mt-3 flex items-center gap-1.5"
                >
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <Input
                    name="title"
                    aria-label={`Quick add a task to ${subject.name}`}
                    placeholder={`Quick add a task to ${subject.name}…`}
                    className="text-sm"
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="shrink-0 px-3"
                    aria-label="Add task"
                  >
                    <PlusIcon width={16} height={16} />
                  </Button>
                </form>
              </Card>
            );
          })}

          {visibleStandalone.length > 0 ? (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-muted ring-2 ring-surface"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">No subject</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {visibleStandalone.length} task
                      {visibleStandalone.length === 1 ? "" : "s"} without a
                      subject
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {visibleStandalone.map((task) => renderTask(task))}
              </div>
              <form
                action={act(createTask, "Task added")}
                className="mt-3 flex items-center gap-1.5"
              >
                <Input
                  name="title"
                  aria-label="Quick add a task without a subject"
                  placeholder="Quick add a task without a subject…"
                  className="text-sm"
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="shrink-0 px-3"
                  aria-label="Add task"
                >
                  <PlusIcon width={16} height={16} />
                </Button>
              </form>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {dueGroups.map((bucket) => (
            <Card key={bucket.group} className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2
                  className={`text-sm font-semibold ${
                    bucket.group === "Overdue"
                      ? "text-rose-600 dark:text-rose-400"
                      : ""
                  }`}
                >
                  {bucket.group}
                </h2>
                <span className="text-xs text-muted">
                  {bucket.items.length} task
                  {bucket.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {bucket.items.map((task) => renderTask(task, true))}
              </div>
            </Card>
          ))}
        </>
      )}

      {nothingToShow ? (
        <EmptyState
          icon={<TasksIcon />}
          title={scope === "mine" ? "No tasks for you yet" : "No tasks yet"}
          hint={
            scope === "mine"
              ? "Switch to Everyone to see the whole group, or add a task and assign yourself."
              : isAdmin
                ? "Create a subject, then add projects and tasks inside it."
                : "Ask an admin to create a subject, then add tasks inside it."
          }
        />
      ) : null}

      <Dialog
        open={addOpen}
        title="Add task"
        description="Tasks can sit under a subject, inside one of its projects, or without a subject."
        size="lg"
        onClose={() => setAddOpen(false)}
      >
        <form
          action={async (fd) => {
            const ok = await run(createTask, fd, "Task created");
            if (ok) setAddOpen(false);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <TaskFields
            subjects={subjects}
            members={members}
            subjectId={addSubjectId}
            projectId={addProjectId}
            onSubjectChange={changeAddSubject}
            onProjectChange={changeAddProject}
            autoFocus
          />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              <PlusIcon width={16} height={16} />
              Add task
            </Button>
          </div>
        </form>
      </Dialog>

      {editing ? (
        <Dialog
          open
          title="Edit task"
          description="Changes are visible to everyone in the group."
          size="lg"
          onClose={() => setEditing(null)}
        >
          <form
            key={editing.id}
            action={saveEdit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <TaskFields
              subjects={subjects}
              members={members}
              subjectId={editSubjectId}
              projectId={editProjectId}
              onSubjectChange={changeEditSubject}
              onProjectChange={changeEditProject}
              defaultTitle={editing.title}
              defaultPriority={editing.priority}
              defaultDue={editing.dueDate?.slice(0, 10) ?? ""}
              assignedIds={editing.assignees.map((assignee) => assignee.id)}
              autoFocus
            />
            <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Save changes
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}

      <Dialog
        open={subjectDialog !== null}
        title={subjectDialog?.mode === "edit" ? "Edit subject" : "New subject"}
        description={
          subjectDialog?.mode === "edit"
            ? "The subject's chat channel is renamed too."
            : "Every subject gets its own chat channel."
        }
        size="sm"
        onClose={() => setSubjectDialog(null)}
      >
        <form
          key={
            subjectDialog?.mode === "edit" ? subjectDialog.subject.id : "new"
          }
          action={saveSubject}
          className="flex flex-col gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Subject name
            </span>
            <Input
              name="name"
              data-autofocus
              defaultValue={
                subjectDialog?.mode === "edit" ? subjectDialog.subject.name : ""
              }
              placeholder="e.g. Biology"
              maxLength={120}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Colour
            </span>
            <Input
              type="color"
              name="color"
              defaultValue={
                subjectDialog?.mode === "edit"
                  ? subjectDialog.subject.color
                  : "#2563eb"
              }
              className="h-11 w-20 cursor-pointer p-1"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSubjectDialog(null)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {subjectDialog?.mode === "edit" ? "Save changes" : "Create subject"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={projectDialog !== null}
        title={projectDialog?.mode === "edit" ? "Edit project" : "New project"}
        description="Projects group tasks inside a subject."
        size="sm"
        onClose={() => setProjectDialog(null)}
      >
        <form
          key={
            projectDialog?.mode === "edit"
              ? projectDialog.project.id
              : `new-${projectDialog?.subjectId ?? ""}`
          }
          action={saveProject}
          className="flex flex-col gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Project title
            </span>
            <Input
              name="title"
              data-autofocus
              defaultValue={
                projectDialog?.mode === "edit" ? projectDialog.project.title : ""
              }
              placeholder="e.g. Revision plan"
              maxLength={160}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Target date
            </span>
            <Input
              type="date"
              name="targetDate"
              defaultValue={
                projectDialog?.mode === "edit"
                  ? projectDialog.project.targetDate?.slice(0, 10) ?? ""
                  : ""
              }
            />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setProjectDialog(null)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {projectDialog?.mode === "edit" ? "Save changes" : "Add project"}
            </Button>
          </div>
        </form>
      </Dialog>

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
