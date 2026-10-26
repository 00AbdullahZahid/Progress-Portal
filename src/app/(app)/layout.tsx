import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateInTz, todayStr } from "@/lib/dates";
import { Shell } from "@/components/shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireUser distinguishes a stale cookie (session expired) from a visitor
  // who was never signed in, so the login page can explain what happened.
  const user = await requireUser();

  const today = todayStr(user.timezone);

  const [chatUnread, dueTasks] = await Promise.all([
    db.message.count({
      where: {
        authorId: { not: user.id },
        ...(user.chatReadAt ? { createdAt: { gt: user.chatReadAt } } : {}),
      },
    }),
    db.task.findMany({
      where: {
        status: { not: "done" },
        dueDate: { not: null },
        assignees: { some: { userId: user.id } },
      },
      select: { dueDate: true },
    }),
  ]);

  const tasksDueToday = dueTasks.filter(
    (task) => task.dueDate && dateInTz(task.dueDate, user.timezone) === today
  ).length;

  // Pass only what the client shell renders. Sending the whole Prisma User
  // would serialize passwordHash and tokenVersion into the RSC payload.
  return (
    <Shell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        color: user.color,
        image: user.image,
      }}
      counts={{ chatUnread, tasksDueToday }}
    >
      {children}
    </Shell>
  );
}
