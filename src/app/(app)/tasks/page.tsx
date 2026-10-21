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
            assignee: true,
            goal: true,
            comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
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
        subtitle="Plan projects, set goals, assign work, and comment along the way."
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
            assignee: t.assignee
              ? { id: t.assignee.id, name: t.assignee.name, color: t.assignee.color }
              : null,
            goal: t.goal ? { id: t.goal.id, title: t.goal.title } : null,
            comments: t.comments.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
              author: { id: c.author.id, name: c.author.name, color: c.author.color },
            })),
          })),
        }))}
        members={members.map((u) => ({ id: u.id, name: u.name, color: u.color }))}
        isAdmin={me.role === "admin"}
      />
    </div>
  );
}
