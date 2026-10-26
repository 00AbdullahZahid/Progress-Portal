import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr, currentStreak, dateInTz, nowMs, shiftDate } from "@/lib/dates";
import { formatClock, formatMinutes, firstName } from "@/lib/format";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { StatCard } from "@/components/stat-card";
import { ProgressCharts, type ChartDay } from "@/components/charts";
import { QuickLinks } from "@/components/quick-links";
import { QuickActions } from "@/components/quick-actions";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { UpNext, type UpNextClass, type UpNextTask } from "@/components/up-next";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { TasksIcon, CheckIcon, StudyIcon, FlameIcon, TrophyIcon, ChatIcon } from "@/components/icons";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The current weekday and minutes-since-midnight in the viewer's timezone. */
function clockInTz(tz: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = Math.max(0, DAY_NAMES.indexOf(get("weekday")));
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { weekday, minutes };
}

function greetingFor(minutes: number): string {
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}

function nextClassFor(
  entries: Array<{
    weekday: number;
    startMin: number;
    endMin: number;
    title: string;
    location: string | null;
    color: string;
  }>,
  tz: string
): UpNextClass | null {
  const { weekday, minutes } = clockInTz(tz);

  const current = entries.find(
    (entry) => entry.weekday === weekday && entry.startMin <= minutes && entry.endMin > minutes
  );
  if (current) {
    return {
      title: current.title,
      location: current.location,
      day: "Now",
      time: `until ${formatClock(current.endMin)}`,
      color: current.color,
    };
  }

  const next = entries
    .map((entry) => {
      let delta = (entry.weekday - weekday + 7) % 7;
      if (delta === 0 && entry.startMin <= minutes) delta = 7;
      return { entry, delta };
    })
    .sort((a, b) => a.delta - b.delta || a.entry.startMin - b.entry.startMin)[0];

  if (!next) return null;

  const day =
    next.delta === 0 ? "Today" : next.delta === 1 ? "Tomorrow" : DAY_NAMES[next.entry.weekday];
  return {
    title: next.entry.title,
    location: next.entry.location,
    day,
    time: `${formatClock(next.entry.startMin)}–${formatClock(next.entry.endMin)}`,
    color: next.entry.color,
  };
}

function dueLabel(dueDate: Date | null, tz: string, today: string): string | null {
  if (!dueDate) return null;
  const date = dateInTz(dueDate, tz);
  const days = Math.round(
    (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `in ${days}d`;
}

export default async function DashboardPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);

  // The charts expose 7/14/30-day ranges, so fetch one 30-day window and slice
  // it on the client. "This week" is still the last 7 days including today.
  const last30 = lastNDays(me.timezone, 30);
  const last7 = last30.slice(-7);
  const weekStart = last7[0];
  const previousWeekStart = shiftDate(weekStart, -7);
  const chartStart = last30[0];

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
    openTasks,
    timetableEntries,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.task.findMany({
      where: { status: "done", completedAt: { not: null } },
      select: {
        completedAt: true,
        assignees: { select: { userId: true } },
      },
    }),
    db.task.count({ where: { status: { not: "done" } } }),
    // Everyone's shared sessions plus your own private ones, so a member's
    // private study time never shows up in another member's numbers.
    db.studySession.findMany({
      where: {
        date: { gte: chartStart },
        OR: [{ shared: true }, { userId: me.id }],
      },
      select: { userId: true, minutes: true, date: true, subject: true },
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
    // Open tasks, nearest deadline first. Used for the "Up next" panel and to
    // name the open task behind the stat-card number.
    db.task.findMany({
      where: { status: { not: "done" } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        assignees: { select: { userId: true } },
      },
      take: 10,
    }),
    // The whole group shares one weekly timetable; only admins edit it.
    db.timetableEntry.findMany({
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: {
        weekday: true,
        startMin: true,
        endMin: true,
        title: true,
        location: true,
        color: true,
      },
    }),
  ]);

  // Bucket completions by the *viewer's* local day, not UTC.
  const localDay = (d: Date) => dateInTz(d, me.timezone);
  const isMine = (task: (typeof tasksDone)[number]) =>
    task.assignees.some((assignee) => assignee.userId === me.id);

  const tasksDoneThisWeek = tasksDone.filter(
    (task) => localDay(task.completedAt!) >= weekStart
  );
  const tasksDonePreviousWeek = tasksDone.filter((task) => {
    const day = localDay(task.completedAt!);
    return day >= previousWeekStart && day < weekStart;
  });
  const doneDelta = tasksDoneThisWeek.length - tasksDonePreviousWeek.length;

  const rangeStart = (days: 7 | 14 | 30) => last30[30 - days];
  const sumMinutes = (rows: typeof studyRows, since: string) =>
    rows.filter((row) => row.date >= since).reduce((sum, row) => sum + row.minutes, 0);

  const studyByDay: ChartDay[] = last30.map((day) => {
    const dayRows = studyRows.filter((row) => row.date === day);
    return {
      label: new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      date: day,
      tasksGroup: tasksDone.filter((task) => localDay(task.completedAt!) === day).length,
      tasksMe: tasksDone.filter(
        (task) => localDay(task.completedAt!) === day && isMine(task)
      ).length,
      minutesGroup: dayRows.reduce((sum, row) => sum + row.minutes, 0),
      minutesMe: dayRows
        .filter((row) => row.userId === me.id)
        .reduce((sum, row) => sum + row.minutes, 0),
    };
  });

  const chartPeople = users.map((user) => {
    const mine = studyRows.filter((row) => row.userId === user.id);
    return {
      id: user.id,
      name: user.name,
      firstName: firstName(user.name),
      color: user.color,
      minutes: {
        7: sumMinutes(mine, rangeStart(7)),
        14: sumMinutes(mine, rangeStart(14)),
        30: sumMinutes(mine, rangeStart(30)),
      },
    };
  });

  const subjectTotals = new Map<string, { 7: number; 14: number; 30: number }>();
  for (const row of studyRows.filter((session) => session.userId === me.id)) {
    const entry = subjectTotals.get(row.subject) ?? { 7: 0, 14: 0, 30: 0 };
    for (const days of [7, 14, 30] as const) {
      if (row.date >= rangeStart(days)) entry[days] += row.minutes;
    }
    subjectTotals.set(row.subject, entry);
  }
  const chartSubjects = Array.from(subjectTotals, ([subject, minutes]) => ({
    subject,
    minutes,
  })).sort((a, b) => b.minutes[30] - a.minutes[30]);

  // Streak per user from the full history.
  function bestStreakFor(userId: string): number {
    const days = new Set(
      checkinHistory.filter((c) => c.habit.ownerId === userId).map((c) => c.date)
    );
    return currentStreak(days, today);
  }

  // Leaderboard covers the last 7 days (matches its label).
  const doneThisWeekByUser = new Map<string, number>();
  for (const task of tasksDoneThisWeek) {
    // A shared task counts for every member assigned to it.
    for (const assignee of task.assignees) {
      doneThisWeekByUser.set(
        assignee.userId,
        (doneThisWeekByUser.get(assignee.userId) ?? 0) + 1
      );
    }
  }
  const weekStudy = studyRows.filter((row) => row.date >= weekStart);
  const weekCheckins = checkinRows.filter((row) => row.date >= weekStart);

  const leaderboard = users.map((user) => {
    const studyMin = weekStudy
      .filter((row) => row.userId === user.id)
      .reduce((sum, row) => sum + row.minutes, 0);
    const checkins = weekCheckins.filter((row) => row.habit.ownerId === user.id).length;
    const done = doneThisWeekByUser.get(user.id) ?? 0;
    // One clear score: completed tasks + check-ins + study hours.
    const score = done + checkins + studyMin / 60;
    return { user, studyMin, checkins, done, score };
  });

  const groupStudyToday = studyRows
    .filter((row) => row.date === today)
    .reduce((sum, row) => sum + row.minutes, 0);
  const myStudyToday = studyRows
    .filter((row) => row.date === today && row.userId === me.id)
    .reduce((sum, row) => sum + row.minutes, 0);
  const checkinsToday = checkinRows.filter((row) => row.date === today).length;
  const myStreak = bestStreakFor(me.id);

  const dailyGoalMinutes =
    me.weeklyGoalMinutes > 0 ? Math.round(me.weeklyGoalMinutes / 7) : 0;
  const dailyGoalPercent =
    dailyGoalMinutes > 0 ? (myStudyToday / dailyGoalMinutes) * 100 : 0;

  const myOpenTasks = openTasks.filter((task) =>
    task.assignees.some((assignee) => assignee.userId === me.id)
  );
  const tasksDueToday = myOpenTasks.filter(
    (task) => task.dueDate && dateInTz(task.dueDate, me.timezone) === today
  ).length;
  const upNextTasks: UpNextTask[] = (myOpenTasks.length > 0 ? myOpenTasks : openTasks)
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      due: dueLabel(task.dueDate, me.timezone, today),
    }));

  // Widget data.
  const deadlineItems = upcomingExams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    kind: exam.kind,
    date: exam.date,
    days: Math.round(
      (Date.parse(exam.date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
        86_400_000
    ),
  }));

  const studyingIds = new Set(todayStudyByUser.map((row) => row.userId));
  const nowTime = nowMs();
  const presence = users
    .filter((user) => user.id !== me.id)
    .filter(
      (user) =>
        studyingIds.has(user.id) ||
        (user.lastSeenAt && nowTime - user.lastSeenAt.getTime() < 10 * 60 * 1000)
    )
    .map((user) => ({
      id: user.id,
      name: user.name,
      color: user.color,
      image: user.image,
      studying: studyingIds.has(user.id),
    }));

  const myWeekMinutes = weekStudy
    .filter((row) => row.userId === me.id)
    .reduce((sum, row) => sum + row.minutes, 0);

  const reportMap = new Map<string, number>();
  for (const row of weekStudy.filter((session) => session.userId === me.id)) {
    reportMap.set(row.subject, (reportMap.get(row.subject) ?? 0) + row.minutes);
  }
  const report = Array.from(reportMap, ([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);

  const nextClass = nextClassFor(timetableEntries, me.timezone);
  const nearestDeadline = deadlineItems[0]
    ? {
        title: deadlineItems[0].title,
        subject: deadlineItems[0].subject,
        days: deadlineItems[0].days,
        when:
          deadlineItems[0].days === 0
            ? "today"
            : deadlineItems[0].days === 1
              ? "tomorrow"
              : `in ${deadlineItems[0].days}d`,
      }
    : null;

  const nowMinutes = clockInTz(me.timezone).minutes;

  return (
    <div>
      <PresenceHeartbeat />
      <PageHeader
        title={`${greetingFor(nowMinutes)}, ${firstName(me.name)}`}
        subtitle="Here's what needs your attention today."
      />

      <UpNext
        nextClass={nextClass}
        deadline={nearestDeadline}
        tasks={upNextTasks}
        tasksDueToday={tasksDueToday}
      />

      <QuickActions />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={tasksTotal}
          icon={<TasksIcon />}
          href="/tasks"
          hint={
            tasksDueToday > 0
              ? `${tasksDueToday} due today`
              : myOpenTasks.length > 0
                ? `Next: ${myOpenTasks[0].title}`
                : "Nothing assigned to you"
          }
          hintTone={tasksDueToday > 0 ? "warn" : "muted"}
        />
        <StatCard
          label="Done (7 days)"
          value={tasksDoneThisWeek.length}
          icon={<CheckIcon />}
          href="/tasks"
          hint={
            doneDelta === 0
              ? "Same as last week"
              : `${doneDelta > 0 ? "+" : ""}${doneDelta} vs last week`
          }
          hintTone={doneDelta > 0 ? "good" : doneDelta < 0 ? "warn" : "muted"}
        />
        <StatCard
          label="Study today"
          value={formatMinutes(myStudyToday)}
          icon={<StudyIcon />}
          href="/study"
          hint={
            dailyGoalMinutes > 0
              ? `${Math.round(dailyGoalPercent)}% of ${formatMinutes(dailyGoalMinutes)} goal · group ${formatMinutes(groupStudyToday)}`
              : `Group studied ${formatMinutes(groupStudyToday)}`
          }
          progressPercent={dailyGoalMinutes > 0 ? dailyGoalPercent : undefined}
          progressLabel={
            dailyGoalMinutes > 0
              ? `${formatMinutes(myStudyToday)} of ${formatMinutes(dailyGoalMinutes)} daily goal`
              : undefined
          }
        />
        <StatCard
          label="Streak"
          value={`${myStreak} day${myStreak === 1 ? "" : "s"}`}
          icon={<FlameIcon />}
          href="/habits"
          hint={`${checkinsToday} check-in${checkinsToday === 1 ? "" : "s"} today`}
          hintTone={myStreak > 0 ? "good" : "muted"}
        />
      </div>

      <div className="mt-6">
        <ProgressCharts days={studyByDay} people={chartPeople} subjects={chartSubjects} />
      </div>

      <div className="mt-6">
        <DashboardWidgets
          goalMinutes={myWeekMinutes}
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              {recentMsgs.map((message) => (
                <li key={message.id} className="flex items-start gap-2.5">
                  <Avatar user={message.author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-ink">{message.author.name}</span>{" "}
                      in #{message.channel.name}
                    </p>
                    <p className="break-words text-sm">{message.body}</p>
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
