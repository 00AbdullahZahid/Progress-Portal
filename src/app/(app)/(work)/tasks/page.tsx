import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TaskBoard } from "@/components/task-board";
import { publicUserSelect } from "@/lib/user";

export default async function TasksPage() {
  const me = await requireUser();
  const [subjects, members, tasks] = await Promise.all([
    db.subject.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        projects: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: publicUserSelect,
    }),
    db.task.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, color: true, image: true } },
          },
        },
        subject: { select: { id: true, name: true, color: true } },
        project: true,
        comments: {
          include: { author: { select: publicUserSelect } },
          orderBy: { createdAt: "asc" },
        },
        studySessions: { select: { minutes: true } },
      },
    }),
  ]);

  const toTask = (t: (typeof tasks)[number]) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    subjectId: t.subjectId ?? t.project?.subjectId ?? null,
    projectId: t.projectId,
    createdById: t.createdById,
    assignees: t.assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      color: a.user.color,
      image: a.user.image,
    })),
    subject: t.subject
      ? { id: t.subject.id, name: t.subject.name, color: t.subject.color }
      : null,
    project: t.project ? { id: t.project.id, title: t.project.title } : null,
    studyMinutes: t.studySessions.reduce((sum, s) => sum + s.minutes, 0),
    comments: t.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: { id: c.author.id, name: c.author.name, color: c.author.color },
    })),
  });

  const tasksBySubject = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const subjectId = task.subjectId ?? task.project?.subjectId ?? null;
    if (!subjectId) continue;
    const list = tasksBySubject.get(subjectId) ?? [];
    list.push(task);
    tasksBySubject.set(subjectId, list);
  }
  const standaloneTasks = tasks
    .filter((task) => !(task.subjectId ?? task.project?.subjectId))
    .map(toTask);

  return (
    <div>
      <PageHeader
        title="Work"
        subtitle="Subjects hold their projects and tasks. Assign work to one or more members, set deadlines, and comment as it moves."
      />
      <TaskBoard
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          archivedAt: s.archivedAt?.toISOString() ?? null,
          projects: s.projects.map((p) => ({
            id: p.id,
            title: p.title,
            targetDate: p.targetDate?.toISOString() ?? null,
          })),
          tasks: (tasksBySubject.get(s.id) ?? []).map(toTask),
        }))}
        standaloneTasks={standaloneTasks}
        members={members.map((u) => ({
          id: u.id,
          name: u.name,
          color: u.color,
          image: u.image,
        }))}
        isAdmin={me.role === "admin"}
        meId={me.id}
      />
    </div>
  );
}
