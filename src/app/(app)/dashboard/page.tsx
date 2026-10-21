import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr, currentStreak, prettyDate } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { StatCard } from "@/components/stat-card";
import { ProgressCharts } from "@/components/charts";
import { TasksIcon, CheckIcon, StudyIcon, FlameIcon, TrophyIcon, ChatIcon } from "@/components/icons";

export default async function DashboardPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);
  const last14 = lastNDays(me.timezone, 14);
  const rangeStart = last14[0];

  const [users, tasksDone, tasksTotal, studyRows, checkinRows, recentMsgs] =
    await Promise.all([
      db.user.findMany({ orderBy: { name: "asc" } }),
      db.task.findMany({
        where: { status: "done", completedAt: { gte: new Date(rangeStart + "T00:00:00Z") } },
        select: { completedAt: true },
      }),
      db.task.count({ where: { status: { not: "done" } } }),
      db.studySession.findMany({
        where: { date: { gte: rangeStart } },
        select: { userId: true, minutes: true, date: true },
      }),
      db.habitCheckIn.findMany({
        where: { date: { gte: rangeStart } },
        select: { habit: { select: { ownerId: true } }, date: true },
      }),
      db.message.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { author: true, channel: true },
      }),
    ]);

  // Tasks completed per day (last 14 days)
  const tasksByDay = last14.map((d) => ({
    label: prettyDate(d),
    date: d,
    count: tasksDone.filter((t) => t.completedAt!.toISOString().slice(0, 10) === d).length,
  }));

  // Study minutes per day, total + by user
  const studyByDay = last14.map((d) => ({
    label: prettyDate(d),
    date: d,
    minutes: studyRows.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0),
  }));

  const studyByUser = users.map((u) => ({
    name: u.name,
    color: u.color,
    minutes: studyRows.filter((s) => s.userId === u.id).reduce((a, s) => a + s.minutes, 0),
  }));

  // Leaderboard
  const myHabits = await db.habit.findMany({
    where: { ownerId: me.id },
    include: { checkins: { where: { date: { gte: lastNDays(me.timezone, 60)[0] } } } },
  });
  const myBestStreak = myHabits.length
    ? Math.max(
        ...myHabits.map((h) =>
          currentStreak(new Set(h.checkins.map((c) => c.date)), today)
        )
      )
    : 0;

  const donePerUser = await db.task.groupBy({
    by: ["assigneeId"],
    where: { status: "done", completedAt: { gte: new Date(rangeStart + "T00:00:00Z") } },
    _count: true,
  });

  const leaderboard = users.map((u) => {
    const studyMin = studyRows
      .filter((s) => s.userId === u.id)
      .reduce((a, s) => a + s.minutes, 0);
    const checkins = checkinRows.filter((c) => c.habit.ownerId === u.id).length;
    const done = donePerUser.find((d) => d.assigneeId === u.id)?._count ?? 0;
    return { user: u, studyMin, checkins, done };
  });

  const groupStudyToday = studyRows
    .filter((s) => s.date === today)
    .reduce((a, s) => a + s.minutes, 0);
  const checkinsToday = checkinRows.filter((c) => c.date === today).length;

  return (
    <div>
      <PageHeader
        title={`Hey ${me.name}`}
        subtitle={`Here's how the group is doing as of ${prettyDate(today)}.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={tasksTotal}
          icon={<TasksIcon />}
        />
        <StatCard
          label="Done this week"
          value={tasksDone.length}
          icon={<CheckIcon />}
        />
        <StatCard
          label="Study today"
          value={`${Math.round(groupStudyToday / 6) / 10}h`}
          icon={<StudyIcon />}
        />
        <StatCard
          label="Check-ins today"
          value={checkinsToday}
          icon={<FlameIcon />}
        />
      </div>

      <div className="mt-6">
        <ProgressCharts tasksByDay={tasksByDay} studyByDay={studyByDay} studyByUser={studyByUser} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <TrophyIcon width={18} height={18} className="text-amber-500" />
            Leaderboard (this week)
          </h2>
          <ul className="flex flex-col gap-2">
            {leaderboard
              .sort((a, b) => b.done + b.checkins + b.studyMin / 60 - (a.done + a.checkins + a.studyMin / 60))
              .map((row, i) => (
                <li
                  key={row.user.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5"
                >
                  <span className="w-5 text-center text-sm font-bold text-muted">
                    {i + 1}
                  </span>
                  <Avatar user={row.user} size="sm" />
                  <span className="flex-1 text-sm font-medium">
                    {row.user.name}
                    {row.user.id === me.id ? (
                      <span className="ml-1 text-xs text-muted">(you)</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted">
                    {row.done} tasks · {row.checkins} check-ins ·{" "}
                    {Math.round(row.studyMin / 6) / 10}h
                  </span>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ChatIcon width={18} height={18} className="text-brand" />
            Latest chat
          </h2>
          {recentMsgs.length === 0 ? (
            <EmptyState icon={<ChatIcon />} title="No messages yet" hint="Say hi in the chat." />
          ) : (
            <ul className="flex flex-col gap-3">
              {recentMsgs.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5">
                  <Avatar user={m.author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-ink">{m.author.name}</span>{" "}
                      in #{m.channel.name}
                    </p>
                    <p className="break-words text-sm">{m.body}</p>
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
