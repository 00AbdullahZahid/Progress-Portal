import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TaskBoard } from "@/components/task-board";

export default async function TasksPage() {
  const me = await requireUser();
  const [projects, members] = await Promise.all([
    db.project.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        goals: { orderBy: { createdAt: "asc" } },
        tasks: {
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          include: {
            assignees: {
              include: {
                user: { select: { id: true, name: true, color: true, image: true } },
              },
            },
            goal: true,
            comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
            studySessions: { select: { minutes: true } },
          },
        },
      },
    }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Tasks & Goals"
        subtitle="Plan projects, set goals, assign work to one or more members, and comment along the way."
      />
      <TaskBoard
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          goals: p.goals.map((g) => ({
            id: g.id,
            title: g.title,
            targetDate: g.targetDate?.toISOString() ?? null,
          })),
          tasks: p.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() ?? null,
            assignees: t.assignees.map((a) => ({
              id: a.user.id,
              name: a.user.name,
              color: a.user.color,
              image: a.user.image,
            })),
            goal: t.goal ? { id: t.goal.id, title: t.goal.title } : null,
            studyMinutes: t.studySessions.reduce((sum, s) => sum + s.minutes, 0),
            comments: t.comments.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
              author: { id: c.author.id, name: c.author.name, color: c.author.color },
            })),
          })),
        }))}
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
