import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr, currentStreak, dateInTz } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { FlameIcon, CheckIcon, StudyIcon, ShieldIcon } from "@/components/icons";

export default async function PeoplePage() {
  const me = await requireUser();
  const range = lastNDays(me.timezone, 30);
  const today = todayStr(me.timezone);

  const [users, doneTasks, studyRows, habits] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] }),
    db.task.findMany({
      where: { status: "done", completedAt: { not: null } },
      select: { assigneeId: true, completedAt: true },
    }),
    db.studySession.findMany({
      where: { date: { gte: range[0] } },
      select: { userId: true, minutes: true },
    }),
    // Full history so streaks aren't capped at 30 days.
    db.habit.findMany({
      include: { checkins: { select: { date: true } } },
    }),
  ]);

  // Count completions that landed within the 30-day window in the viewer's tz.
  const doneByUser = new Map<string, number>();
  for (const t of doneTasks) {
    if (!t.assigneeId || !t.completedAt) continue;
    if (dateInTz(t.completedAt, me.timezone) < range[0]) continue;
    doneByUser.set(t.assigneeId, (doneByUser.get(t.assigneeId) ?? 0) + 1);
  }

  const rows = users.map((u) => {
    const studyMin = studyRows.filter((s) => s.userId === u.id).reduce((a, s) => a + s.minutes, 0);
    const done = doneByUser.get(u.id) ?? 0;
    const myHabits = habits.filter((h) => h.ownerId === u.id);
    const bestStreak = myHabits.length
      ? Math.max(...myHabits.map((h) => currentStreak(new Set(h.checkins.map((c) => c.date)), today)))
      : 0;
    return { user: u, studyMin, done, bestStreak, habitCount: myHabits.length };
  });

  return (
    <div>
      <PageHeader title="People" subtitle="The crew and their progress over the last 30 days." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.user.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar user={r.user} size="lg" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold">
                  {r.user.name}
                  {r.user.role === "admin" ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <ShieldIcon width={10} height={10} />
                      Admin
                    </span>
                  ) : null}
                  {r.user.id === me.id ? (
                    <span className="text-xs text-muted">(you)</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted">@{r.user.handle}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface2 p-2">
                <CheckIcon width={16} height={16} className="mx-auto text-emerald-500" />
                <p className="text-lg font-bold">{r.done}</p>
                <p className="text-[11px] text-muted">tasks</p>
              </div>
              <div className="rounded-xl bg-surface2 p-2">
                <StudyIcon width={16} height={16} className="mx-auto text-brand" />
                <p className="text-lg font-bold">{Math.round(r.studyMin / 6) / 10}h</p>
                <p className="text-[11px] text-muted">studied</p>
              </div>
              <div className="rounded-xl bg-surface2 p-2">
                <FlameIcon width={16} height={16} className="mx-auto text-orange-500" />
                <p className="text-lg font-bold">{r.bestStreak}</p>
                <p className="text-[11px] text-muted">best streak</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <ShieldIcon width={18} height={18} className="text-amber-500" />
          Accounts
        </h2>
        <p className="text-sm text-muted">
          Everyone signs in with a username and password. Members can change their own password
          under{" "}
          <a href="/settings" className="font-medium text-brand hover:underline">
            Settings
          </a>
          . The super admin can reset any member&apos;s password from the{" "}
          <a href="/admin" className="font-medium text-brand hover:underline">
            Admin
          </a>{" "}
          page.
        </p>
      </Card>
    </div>
  );
}
