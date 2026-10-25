import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr, currentStreak, prettyDate, dateInTz, nowMs } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { StatCard } from "@/components/stat-card";
import { ProgressCharts } from "@/components/charts";
import { QuickLinks } from "@/components/quick-links";
import { QuickActions } from "@/components/quick-actions";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { TasksIcon, CheckIcon, StudyIcon, FlameIcon, TrophyIcon, ChatIcon } from "@/components/icons";

export default async function DashboardPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);

  // "This week" = the last 7 days including today, in the viewer's timezone.
  const last7 = lastNDays(me.timezone, 7);
  const weekStart = last7[0];
  // The chart shows a 14-day window.
  const last14 = lastNDays(me.timezone, 14);
  const chartStart = last14[0];

  const [
    users,
    tasksDone,
    tasksTotal,
    studyRows,
    checkinRows,
    recentMsgs,
    checkinHistory,
    upcomingExams,
    todayStudyByUser,
    mySubjects,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.task.findMany({
      where: { status: "done", completedAt: { not: null } },
      select: { completedAt: true, assigneeId: true },
    }),
    db.task.count({ where: { status: { not: "done" } } }),
    // Everyone's shared sessions plus your own private ones, so a member's
    // private study time never shows up in another member's numbers.
    db.studySession.findMany({
      where: {
        date: { gte: chartStart },
        OR: [{ shared: true }, { userId: me.id }],
      },
      select: { userId: true, minutes: true, date: true },
    }),
    db.habitCheckIn.findMany({
      where: { date: { gte: chartStart } },
      select: { habit: { select: { ownerId: true } }, date: true },
    }),
    db.message.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { author: true, channel: true },
    }),
    // Full check-in history for streaks — no artificial cap.
    db.habitCheckIn.findMany({
      select: { date: true, habit: { select: { ownerId: true } } },
    }),
    // Upcoming exams/assignments for the countdown widget.
    db.exam.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, subject: true, kind: true, date: true },
      take: 6,
    }),
    // Which members have logged study today, for the presence widget. Private
    // sessions stay private, so only shared sessions mark someone as studying.
    db.studySession.findMany({
      where: { date: today, shared: true },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // The viewer's own subject breakdown for the weekly report.
    db.studySession.groupBy({
      by: ["subject"],
      where: { userId: me.id, date: { gte: weekStart } },
      _sum: { minutes: true },
    }),
  ]);

  // Bucket completions by the *viewer's* local day, not UTC.
  const localDay = (d: Date) => dateInTz(d, me.timezone);

  const tasksDoneThisWeek = tasksDone.filter(
    (t) => localDay(t.completedAt!) >= weekStart
  );

  const tasksByDay = last14.map((d) => ({
    label: prettyDate(d),
    date: d,
    count: tasksDone.filter((t) => localDay(t.completedAt!) === d).length,
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

  // Streak per user from the full history.
  function bestStreakFor(userId: string): number {
    const days = new Set(
      checkinHistory.filter((c) => c.habit.ownerId === userId).map((c) => c.date)
    );
    return currentStreak(days, today);
  }

  // Leaderboard covers the last 7 days (matches its label).
  const doneThisWeekByUser = new Map<string, number>();
  for (const t of tasksDoneThisWeek) {
    if (!t.assigneeId) continue;
    doneThisWeekByUser.set(t.assigneeId, (doneThisWeekByUser.get(t.assigneeId) ?? 0) + 1);
  }
  const weekStudy = studyRows.filter((s) => s.date >= weekStart);
  const weekCheckins = checkinRows.filter((c) => c.date >= weekStart);

  const leaderboard = users.map((u) => {
    const studyMin = weekStudy
      .filter((s) => s.userId === u.id)
      .reduce((a, s) => a + s.minutes, 0);
    const checkins = weekCheckins.filter((c) => c.habit.ownerId === u.id).length;
    const done = doneThisWeekByUser.get(u.id) ?? 0;
    // One clear score: completed tasks + check-ins + study hours.
    const score = done + checkins + studyMin / 60;
    return { user: u, studyMin, checkins, done, score };
  });

  const groupStudyToday = studyRows
    .filter((s) => s.date === today)
    .reduce((a, s) => a + s.minutes, 0);
  const checkinsToday = checkinRows.filter((c) => c.date === today).length;

  const myStreak = bestStreakFor(me.id);

  // Widget data.
  const deadlineItems = upcomingExams.map((e) => ({
    id: e.id,
    title: e.title,
    subject: e.subject,
    kind: e.kind,
    date: e.date,
    days: Math.round(
      (Date.parse(e.date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000
    ),
  }));

  const studyingIds = new Set(todayStudyByUser.map((s) => s.userId));
  const nowTime = nowMs();
  const presence = users
    .filter((u) => u.id !== me.id)
    .filter((u) => studyingIds.has(u.id) || (u.lastSeenAt && nowTime - u.lastSeenAt.getTime() < 10 * 60 * 1000))
    .map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      image: u.image,
      studying: studyingIds.has(u.id),
    }));

  const myWeekMinutes = weekStudy
    .filter((s) => s.userId === me.id)
    .reduce((a, s) => a + s.minutes, 0);
  const report = mySubjects
    .map((r) => ({ subject: r.subject, minutes: r._sum.minutes ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);

  return (
    <div>
      <PresenceHeartbeat />
      <PageHeader
        title={`Hey ${me.name}`}
        subtitle={`Here's how the group is doing as of ${prettyDate(today)}.`}
      />

      <QuickActions />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={tasksTotal}
          icon={<TasksIcon />}
        />
        <StatCard
          label="Done (7 days)"
          value={tasksDoneThisWeek.length}
          icon={<CheckIcon />}
        />
        <StatCard
          label="Study today"
          value={`${Math.round(groupStudyToday / 6) / 10}h`}
          icon={<StudyIcon />}
        />
        <StatCard
          label={myStreak > 0 ? `Streak: ${myStreak}d` : "Check-ins today"}
          value={checkinsToday}
          icon={<FlameIcon />}
        />
      </div>

      <div className="mt-6">
        <ProgressCharts tasksByDay={tasksByDay} studyByDay={studyByDay} studyByUser={studyByUser} />
      </div>

      <div className="mt-6">
        <DashboardWidgets
          goalMinutes={me.weeklyGoalMinutes}
          goalTargetMinutes={me.weeklyGoalMinutes}
          myWeekMinutes={myWeekMinutes}
          myStreak={myStreak}
          freezes={me.streakFreezesFree}
          deadlines={deadlineItems}
          presence={presence}
          report={report}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Jump to
        </h2>
        <QuickLinks />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <TrophyIcon width={18} height={18} className="text-amber-500" />
            Leaderboard (last 7 days)
          </h2>
          <ul className="flex flex-col gap-2">
            {leaderboard
              .sort((a, b) => b.score - a.score)
              .map((row, i) => (
                <li
                  key={row.user.id}
                  className="flex items-center gap-2 rounded-xl px-1 py-1.5 sm:gap-3 sm:px-2"
                >
                  <span className="w-4 shrink-0 text-center text-sm font-bold text-muted sm:w-5">
                    {i + 1}
                  </span>
                  <Avatar user={row.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.user.name}
                      {row.user.id === me.id ? (
                        <span className="ml-1 text-xs text-muted">(you)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-muted sm:hidden">
                      {row.done} tasks · {row.checkins} check-ins ·{" "}
                      {Math.round(row.studyMin / 6) / 10}h
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted sm:block">
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
