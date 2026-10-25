import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { lastNDays, todayStr, prettyDate } from "@/lib/dates";
import { supportedTimezones } from "@/lib/validation";
import { PageHeader, Card } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { AdminUserManager } from "@/components/admin-user-manager";
import { Avatar } from "@/components/avatar";
import {
  PeopleIcon,
  TasksIcon,
  CheckIcon,
  StudyIcon,
  ChatIcon,
  StudyIcon as BookIcon,
} from "@/components/icons";

export default async function AdminDashboardPage() {
  const me = await requireAdmin();
  const range = lastNDays(me.timezone, 30);
  const today = todayStr(me.timezone);

  const [users, tasks, studyRows, checkinRows, recentMessages, recentStudy] =
    await Promise.all([
      db.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] }),
      db.task.findMany({ select: { status: true } }),
      db.studySession.findMany({
        where: {
          date: { gte: range[0] },
          OR: [{ shared: true }, { userId: me.id }],
        },
        select: { minutes: true },
      }),
      db.habitCheckIn.findMany({ where: { date: today }, select: { id: true } }),
      db.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { author: true, channel: true },
      }),
      db.studySession.findMany({
        where: { OR: [{ shared: true }, { userId: me.id }] },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          subject: true,
          minutes: true,
          date: true,
          createdAt: true,
          user: { select: { id: true, name: true, color: true, image: true } },
        },
      }),
    ]);

  const totalMembers = users.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const openTasks = tasks.length - doneTasks;
  const completion = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const studyTotal = studyRows.reduce((a, s) => a + s.minutes, 0);
  const checkinsToday = checkinRows.length;

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Super admin overview as of ${prettyDate(today)}.`}
      />

      {/* Group stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Members" value={totalMembers} icon={<PeopleIcon />} />
        <StatCard label="Open tasks" value={openTasks} icon={<TasksIcon />} />
        <StatCard label="Completion" value={`${completion}%`} icon={<CheckIcon />} />
        <StatCard
          label="Study (30d)"
          value={`${Math.round(studyTotal / 6) / 10}h`}
          icon={<StudyIcon />}
        />
      </div>

      {/* Today strip */}
      <Card className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <span className="flex items-center gap-2 text-sm">
          <CheckIcon width={18} height={18} className="text-emerald-500" />
          <span className="font-semibold">{checkinsToday}</span>
          <span className="text-muted">habit check-ins today</span>
        </span>
        <span className="flex items-center gap-2 text-sm">
          <TasksIcon width={18} height={18} className="text-brand" />
          <span className="font-semibold">{doneTasks}</span>
          <span className="text-muted">tasks completed (all time)</span>
        </span>
      </Card>

      {/* Manage users */}
      <div className="mt-6">
        <AdminUserManager
          members={users.map((u) => ({
            id: u.id,
            handle: u.handle,
            name: u.name,
            role: u.role,
            color: u.color,
            timezone: u.timezone,
            isActive: u.isActive,
            image: u.image,
          }))}
          meId={me.id}
          timezoneOptions={[
            "Asia/Karachi",
            "UTC",
            ...supportedTimezones().filter(
              (tz) => tz !== "Asia/Karachi" && tz !== "UTC"
            ),
          ]}
        />
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ChatIcon width={18} height={18} className="text-brand" />
            Recent chat
          </h2>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentMessages.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5">
                  <Avatar user={m.author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-ink">{m.author.name}</span> in #
                      {m.channel.name} ·{" "}
                      {m.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="truncate text-sm">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <BookIcon width={18} height={18} className="text-brand" />
            Recent study sessions
          </h2>
          {recentStudy.length === 0 ? (
            <p className="text-sm text-muted">No study sessions yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentStudy.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <Avatar user={s.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-semibold">{s.user.name}</span> — {s.subject}
                    </p>
                    <p className="text-xs text-muted">
                      {Math.round(s.minutes)} min ·{" "}
                      {s.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
