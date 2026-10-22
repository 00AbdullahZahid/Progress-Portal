import Link from "next/link";
import { Card } from "./ui";
import { Avatar } from "./avatar";
import { CalendarIcon, TimerIcon, StudyIcon, FlameIcon, TrophyIcon } from "./icons";

export type DeadlineItem = {
  id: string;
  title: string;
  subject: string;
  kind: string;
  date: string;
  days: number;
};

export type PresenceUser = {
  id: string;
  name: string;
  color: string;
  image: string | null;
  studying: boolean;
};

/** A circular progress ring for the weekly goal. */
function GoalRing({ percent, label }: { percent: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-surface2" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-brand transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{Math.round(clamped)}%</span>
        <span className="text-[10px] text-muted">{label}</span>
      </div>
    </div>
  );
}

export function DashboardWidgets({
  goalMinutes,
  goalTargetMinutes,
  myWeekMinutes,
  myStreak,
  freezes,
  deadlines,
  presence,
  report,
}: {
  goalMinutes: number;
  goalTargetMinutes: number;
  myWeekMinutes: number;
  myStreak: number;
  freezes: number;
  deadlines: DeadlineItem[];
  presence: PresenceUser[];
  report: { subject: string; minutes: number }[];
}) {
  const percent =
    goalTargetMinutes > 0 ? (myWeekMinutes / goalTargetMinutes) * 100 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex items-center gap-5 p-4">
        <GoalRing percent={percent} label="of goal" />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <TimerIcon width={18} height={18} className="text-brand" />
            This week&apos;s goal
          </h2>
          <p className="mt-1 text-sm text-muted">
            {Math.round(myWeekMinutes / 6) / 10}h studied
            {goalTargetMinutes > 0
              ? ` of ${Math.round(goalTargetMinutes / 6) / 10}h`
              : ""}
          </p>
          {goalTargetMinutes === 0 ? (
            <Link href="/settings" className="mt-1 inline-block text-xs text-brand hover:underline">
              Set a weekly goal
            </Link>
          ) : null}
          <p className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <FlameIcon width={14} height={14} className="text-amber-500" />
              {myStreak}-day streak
            </span>
            <span>{freezes} rest day{freezes === 1 ? "" : "s"}</span>
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <CalendarIcon width={18} height={18} className="text-brand" />
          Upcoming deadlines
        </h2>
        {deadlines.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing due soon.{" "}
            <Link href="/exams" className="text-brand hover:underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deadlines.map((d) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    d.days <= 2
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-brand-soft text-brand"
                  }`}
                >
                  {d.days}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{d.title}</span>
                  <span className="ml-1 text-xs text-muted">{d.subject}</span>
                </span>
                <span className="text-xs text-muted">
                  {d.days === 0 ? "today" : d.days === 1 ? "tomorrow" : `in ${d.days}d`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <StudyIcon width={18} height={18} className="text-brand" />
          Who&apos;s around
        </h2>
        {presence.length === 0 ? (
          <p className="text-sm text-muted">No one else is online right now.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {presence.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="relative">
                  <Avatar user={{ name: p.name, color: p.color, image: p.image }} size="sm" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${
                      p.studying ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                </span>
                <span className="text-xs">
                  {p.name}
                  <span className="block text-[10px] text-muted">
                    {p.studying ? "studying" : "online"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <TrophyIcon width={18} height={18} className="text-amber-500" />
          Your week in review
        </h2>
        {report.length === 0 ? (
          <p className="text-sm text-muted">Log a few sessions to see your weekly breakdown.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {report.map((r) => {
              const max = Math.max(1, ...report.map((x) => x.minutes));
              return (
                <div key={r.subject}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{r.subject}</span>
                    <span className="text-muted">{Math.round(r.minutes / 6) / 10}h</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(r.minutes / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          {goalMinutes} min logged this week in total.
        </p>
      </Card>
    </div>
  );
}
